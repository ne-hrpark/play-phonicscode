import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { initCommonScripts } from '../utils/common';
import { loadQuizDataFromExcel, findQuizData, getLastSequences, getLastProblemNumberForUnit, type QuizData } from '../utils/excelData';

declare global {
  interface Window {
    interact: any;
    $: any;
    jQuery: any;
    deviceType: string;
  }
}

// 쿠키 관리 함수
function getCookie(name: string): string | null {
	return document.cookie
    .split('; ')
    .map((v) => v.split('='))
		.find(([key]) => key === name)?.[1] || null;
}

function setCookie(name: string, value: string, days: number) {
	const d = new Date();
	d.setDate(d.getDate() + days);
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${d.toUTCString()}`;
}

// function deleteCookie(name: string) {
//   document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
// }

// playAudio 함수
const playAudio = (src: string | null, onEnded?: () => void) => {
  const player = document.getElementById('player') as HTMLAudioElement;
  if (!player) {
    // console.error('player 요소를 찾을 수 없습니다.');
    return;
  }

  // 기존 핸들러 제거
  if ((player as any)._onEndedHandler) {
    player.removeEventListener('ended', (player as any)._onEndedHandler);
    (player as any)._onEndedHandler = null;
  }

  player.pause();
  player.currentTime = 0;

  if (!src) {
    player.removeAttribute('src');
    player.load();
    return;
  }

  player.src = src;
  player.load();

  // 콜백이 한 번만 호출되도록 플래그 사용
  let callbackCalled = false;
  const safeOnEnded = () => {
    if (callbackCalled) return;
    callbackCalled = true;
    if (typeof onEnded === 'function') {
      onEnded();
    }
  };

  if (typeof onEnded === 'function') {
    (player as any)._onEndedHandler = safeOnEnded;
    player.addEventListener('ended', safeOnEnded, { once: true });
  }

  player
    .play()
    .then(() => {
      player.pause();
      player.play().catch(() => {
        // 재생 실패 시에도 ended 이벤트가 발생할 수 있으므로 직접 호출하지 않음
        // console.warn('unmute 재생 실패:', err);
      });
    })
    .catch(() => {
      // 재생 실패 시에도 ended 이벤트가 발생할 수 있으므로 직접 호출하지 않음
      // console.warn('첫 재생 실패:', err);
    });
};

type ShadowPuzzleParams = {
  level?: string;
  unit?: string;
  problemNumber?: string;
};

const ShadowPuzzle = () => {
  const navigate = useNavigate();
  const { level: levelParam, unit: unitParam, problemNumber: problemNumberParam } =
    useParams<ShadowPuzzleParams>();
  const [searchParams] = useSearchParams();

  // 1순위: path 파라미터 /shadow-puzzle/:level/:unit/:problemNumber
  // 2순위: 쿼리 파라미터 ?book_seq=&unit_seq=&quiz_seq= (혹은 level/unit/problem_number)
  // 3순위: 기본값
  const level =
    levelParam ||
    searchParams.get('book_seq') ||
    searchParams.get('level') ||
    '1';
  const unit =
    unitParam ||
    searchParams.get('unit_seq') ||
    searchParams.get('unit') ||
    '1';
  const problemNumber =
    problemNumberParam ||
    searchParams.get('quiz_seq') ||
    searchParams.get('problem_number') ||
    '1';

  const [showTutorial, setShowTutorial] = useState(false);
  const [showUnitIntro, setShowUnitIntro] = useState(false);
  const [showQuizFinal, setShowQuizFinal] = useState(false);
  const [quizContent, setQuizContent] = useState('');
  const [currentLevel, setCurrentLevel] = useState(level);
  const [currentUnit, setCurrentUnit] = useState(unit);
  const [currentProblemNumber, setCurrentProblemNumber] = useState(problemNumber);
  const [quizDataList, setQuizDataList] = useState<QuizData[]>([]);

  const lastUnitRef = useRef(0);
  const lastProblemNumberRef = useRef(0);
  const droppedRef = useRef(false);
  const nextLockedRef = useRef(false);
  const audioCallbackLockRef = useRef(false);
  const interactInstanceRef = useRef<any>(null);
  const quizDataListRef = useRef<QuizData[]>([]);

  // 닫기 버튼 이벤트 바인딩 (quizContent 변경 시)
  useEffect(() => {
    if (!quizContent) return;

    // DOM이 완전히 업데이트될 때까지 대기
    const timeoutId = setTimeout(() => {
      const handleCloseClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target && (target.id === 'btnClose' || target.closest('#btnClose'))) {
          e.preventDefault();
          e.stopPropagation();
          // 기존 쿼리 방식: /select-play?book_seq=&unit_seq=
          // 새로운 라우트 방식: /select-play/:bookSeq/:unitSeq
          navigate(`/select-play/${currentLevel}/${currentUnit}`);
        }
      };

      const quizContainer = document.getElementById('quizContainer');
      if (quizContainer) {
        // 기존 리스너 제거 후 새로 등록
        quizContainer.removeEventListener('click', handleCloseClick);
        quizContainer.addEventListener('click', handleCloseClick);
      }

      return () => {
        if (quizContainer) {
          quizContainer.removeEventListener('click', handleCloseClick);
        }
      };
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [quizContent, currentLevel, currentUnit, navigate]);

  useEffect(() => {
    initCommonScripts();
    initTutorialState();

    // 엑셀 데이터 로드
    // PROD에서는 외부 CDN 경로(VITE_QUIZ_DATA_CDN_URL)가 설정되어 있으면 그걸 사용,
    // 아니면 현재 앱의 BASE_URL을 기준으로 /data/quiz_data.xls 사용
    const quizCdnUrl = (import.meta as any).env.VITE_QUIZ_DATA_CDN_URL as string | undefined;
    const quizFilePath =
      import.meta.env.PROD && quizCdnUrl
        ? quizCdnUrl
        : `${import.meta.env.BASE_URL}data/quiz_data.xls`;

    loadQuizDataFromExcel(quizFilePath)
      .then((data) => {
        // console.log('엑셀 데이터 로드 성공:', data);
        // console.log('로드된 데이터 개수:', data.length);
        if (data.length > 0) {
          // console.log('첫 번째 데이터 샘플:', data[0]);
        }
        setQuizDataList(data);
        quizDataListRef.current = data; // ref에도 저장
        if (data.length > 0) {
          // 초기 로드 시 Unit 1이 아니고 첫 번째 문제면 unitIntro 표시
          const showIntro = unit !== '1' && problemNumber === '1';
          getQuizInfo(level, unit, problemNumber, data, showIntro);
        } else {
          // console.error('엑셀 데이터가 비어있습니다.');
          alert('엑셀 데이터를 찾을 수 없습니다. /public/data/quiz_data.xls 파일을 확인해주세요.');
        }
      })
      .catch((_error) => {
        // console.error('엑셀 데이터 로드 실패:', _error);
        // console.error('에러 상세:', _error);
        alert('엑셀 데이터 로드에 실패했습니다. 콘솔을 확인해주세요.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, unit, problemNumber]);

  const initTutorialState = () => {
    const hidden = getCookie('tutorialHideShadow') === 'true';
    setShowTutorial(!hidden);
    setShowUnitIntro(hidden);
  };

  const handleTutorialClose = () => {
    setCookie('tutorialHideShadow', 'true', 1);
    setShowTutorial(false);
    setShowUnitIntro(true);
    startAudioOnClick();
  };

  const handleUnitIntroStart = () => {
    setShowUnitIntro(false);
    const player = document.getElementById('player') as HTMLAudioElement;
    const itemBox = document.getElementById('itemBox');
    const firstBtn = (itemBox && itemBox.querySelector('.btn_audio[data-src]')) || document.querySelector('.btn_audio[data-src]');

    if (player && firstBtn && (firstBtn as HTMLElement).dataset.src) {
      const src = (firstBtn as HTMLElement).dataset.src || null;
      playAudio(src, () => {
        const btn = document.querySelector('.btn_audio');
        if (btn) btn.classList.remove('animate');
      });
      const btn = document.querySelector('.btn_audio');
      if (btn) btn.classList.add('animate');
    }
  };

  const startAudioOnClick = () => {
    // Unit 첫 문제 시작 시 오디오 재생
    if (currentProblemNumber === '1') {
      // handleUnitIntroStart에서 처리
    }
  };

  const getQuizInfo = (levelStr: string, unitStr: string, problemNumberStr: string, data: QuizData[] = quizDataList, showUnitIntroFlag: boolean = false) => {
    const quizData = findQuizData(data, levelStr, unitStr, problemNumberStr);

    if (!quizData) {
      alert('The issue cannot be found. Please start again from the first item.');
      navigate('/select-play');
      return;
    }

    // 콘솔에 엑셀 데이터 정보 출력
    // console.log('=== Shadow Puzzle 퀴즈 데이터 정보 ===');
    // console.log('레벨:', quizData.level);
    // console.log('유닛:', quizData.unit);
    // console.log('문제번호:', quizData.problem_number);
    // console.log('정답(음가):', quizData.answer_phonetic);
    // console.log('단어:', quizData.word);
    // console.log('색상 표시 시작:', quizData.color_display_start);
    // console.log('색상 표시 개수:', quizData.color_display_count);
    // console.log('정답 이미지 경로:', quizData.correct_image_path);
    // console.log('그림자 이미지 경로:', quizData.shadow_image_path);
    // console.log('정답 음원 경로:', quizData.correct_audio_path);
    // console.log('타겟음가:', quizData.target_phonetic);
    // console.log('전체 데이터:', quizData);
    // console.log('=====================================');

    // 마지막 unit와 problem_number 가져오기
    const { lastUnit, lastProblemNumber } = getLastSequences(data, levelStr);
    lastUnitRef.current = lastUnit;
    lastProblemNumberRef.current = lastProblemNumber;

    // 그림자 이미지 경로
    const shadowImagePath = quizData.shadow_image_path.startsWith('http')
      ? quizData.shadow_image_path
      : `https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/${quizData.shadow_image_path}`;

    // 정답 오디오 경로
    const answerAudioPath = quizData.correct_audio_path.startsWith('http')
      ? quizData.correct_audio_path
      : `https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/${quizData.correct_audio_path}`;

    // 같은 레벨, 같은 유닛의 다른 문제들에서 보기 가져오기 (정답 제외)
    const sameLevelUnit = data.filter(
      (item) => item.level === quizData.level && item.unit === quizData.unit && item.word !== quizData.word
    );
    
    // 랜덤으로 섞기
    const shuffledOptions = [...sameLevelUnit].sort(() => Math.random() - 0.5);
    
    // 정답 + 다른 보기 1개 (총 2개)
    const allOptions = [quizData, ...shuffledOptions.slice(0, 1)];
    const finalOptions = allOptions.sort(() => Math.random() - 0.5);

    // 단어에 슬롯 문자 시작/종료 위치에 <em> 태그 추가하는 함수
    const formatWordWithSlot = (word: string, slotStart?: number, slotEnd?: number) => {
      if (!slotStart || !slotEnd || slotStart < 1 || slotEnd < slotStart) return word;
      
      let result = '';
      for (let i = 0; i < word.length; i++) {
        const char = word.charAt(i);
        const pos = i + 1; // 1-based index
        
        // 슬롯 시작 위치
        if (pos === slotStart) {
          result += '<em>';
        }
        
        result += char;
        
        // 슬롯 종료 위치
        if (pos === slotEnd) {
          result += '</em>';
        }
      }
      return result;
    };

    // drop_zone HTML 생성
    const dropZoneHtml = `
      <div class="drop_zone" data-accept="${quizData.word}">
        <div class="img_box"><img src="${shadowImagePath}" alt="${quizData.word}"></div>
        <button type="button" id="btnAudio" class="btn_audio" data-src="${answerAudioPath}">
          <svg xmlns="http://www.w3.org/2000/svg" width="58.38" height="48.667" viewBox="0 0 58.38 48.667">
            <path id="speaker" d="M29.3,1.957A1.954,1.954,0,0,0,26.031.516L14.651,10.928V10.74H1.953A1.953,1.953,0,0,0,0,12.694V35.973a1.954,1.954,0,0,0,1.953,1.953h12.7v-.188L26.031,48.151A1.954,1.954,0,0,0,29.3,46.709Z"></path>
            <path class="line1" d="M201.347,112.335a2.22,2.22,0,0,1-1.419-3.928,3.535,3.535,0,0,0,1.194-2.668,4.138,4.138,0,0,0-1.267-3.138,2.22,2.22,0,1,1,2.983-3.288,8.632,8.632,0,0,1,2.723,6.523,7.962,7.962,0,0,1-2.8,5.987,2.211,2.211,0,0,1-1.417.512" transform="translate(-163.763 -81.203)"></path>
            <path class="line2" d="M236.564,97.543a2.22,2.22,0,0,1-1.552-3.807,9.138,9.138,0,0,0,0-14.131,2.22,2.22,0,0,1,3.1-3.174,13.544,13.544,0,0,1,0,20.48,2.213,2.213,0,0,1-1.552.633" transform="translate(-192.727 -62.337)"></path>
            <path class="line3" d="M271.265,83.174a2.22,2.22,0,0,1-1.45-3.9,13.773,13.773,0,0,0,0-21.856,2.22,2.22,0,0,1,2.9-3.364,18.2,18.2,0,0,1,0,28.584,2.211,2.211,0,0,1-1.448.538" transform="translate(-221.265 -44.011)"></path>
          </svg>
        </button>
      </div>
    `;

    // 보기 아이템 HTML 생성 (item 사이에 drop_zone 삽입)
    let itemsHtml = '';
    finalOptions.forEach((option, index) => {
      const optionImagePath = option.correct_image_path.startsWith('http')
        ? option.correct_image_path
        : `https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/${option.correct_image_path}`;
      
      const wordHtml = formatWordWithSlot(option.word, option.slot_char_start, option.slot_char_end);
      
      itemsHtml += `
        <div class="item" id="${option.word}">
          <div class="img_box"><img src="${optionImagePath}" alt="${option.word}"></div>
          <div class="word">${wordHtml}</div>
        </div>
      `;
      
      // 첫 번째 item 다음에 drop_zone 삽입
      if (index === 0) {
        itemsHtml += dropZoneHtml;
      }
    });

    // HTML 생성 (Shadow Puzzle 구조)
    const html = `
      <header class="play_header">
        <span class="pagination"><strong>${problemNumberStr}</strong>/${lastProblemNumber}</span>
        <a href="#" class="btn_close" id="btnClose">닫기</a>
      </header>
      <div id="itemBox" class="item_box" 
        data-last-unit-seq="${lastUnit}" 
        data-last-quiz-seq="${lastProblemNumber}" 
        data-current-book-seq="${levelStr}" 
        data-current-unit-seq="${unitStr}" 
        data-current-quiz-seq="${problemNumberStr}" 
        data-src="${answerAudioPath}">
        ${itemsHtml}
      </div>
    `;

            setQuizContent(html);
            setCurrentLevel(levelStr);
            setCurrentUnit(unitStr);
            setCurrentProblemNumber(problemNumberStr);
            nextLockedRef.current = false; // 새 문제 로드 시 잠금 해제
            audioCallbackLockRef.current = false; // 새 문제 로드 시 오디오 콜백 잠금 해제

            // Unit이 바뀌고 첫 번째 문제면 unitIntro 표시
            if (showUnitIntroFlag && problemNumberStr === '1') {
              setShowUnitIntro(true);
            }

            setTimeout(() => {
      // 닫기 버튼 이벤트 바인딩 (이벤트 위임 사용)
      const quizContainer = document.getElementById('quizContainer');
      if (quizContainer) {
        // 기존 이벤트 리스너 제거 후 새로 등록
          const handleCloseClick = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target && (target.id === 'btnClose' || target.closest('#btnClose'))) {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/select-play/${levelStr}/${unitStr}`);
            }
          };
        
        // 기존 리스너 제거
        quizContainer.removeEventListener('click', handleCloseClick);
        // 새 리스너 등록
        quizContainer.addEventListener('click', handleCloseClick);
      }
      wireUpAudioAndNext(showUnitIntroFlag && problemNumberStr === '1');
      setupInteract();
    }, 100);
  };

  const wireUpAudioAndNext = (isUnitFirst: boolean = false) => {
    const itemBox = document.getElementById('itemBox');
    if (!itemBox) return;

    lastUnitRef.current = parseInt(itemBox.dataset.lastUnitSeq || '0', 10);
    lastProblemNumberRef.current = parseInt(itemBox.dataset.lastQuizSeq || '0', 10);
    setCurrentLevel(itemBox.dataset.currentBookSeq || '1');
    setCurrentUnit(itemBox.dataset.currentUnitSeq || '1');
    setCurrentProblemNumber(itemBox.dataset.currentQuizSeq || '1');

    const answerMp3 = itemBox.dataset.src || '';

    // 음원 플레이 공통 함수
    const autoAudioPlay = () => {
      const player = document.getElementById('player') as HTMLAudioElement;
      if (player && answerMp3) {
        playAudio(answerMp3, () => {
          const btn = document.querySelector('.btn_audio');
          if (btn) btn.classList.remove('animate');
        });
        const btn = document.querySelector('.btn_audio');
        if (btn) btn.classList.add('animate');
      }
    };

    // 보기 클릭 시(정답 확정 전) 미리 듣기
    const dropZones = document.querySelectorAll('.drop_zone');
    dropZones.forEach((zone) => {
      zone.addEventListener('click', () => {
        if (!zone.classList.contains('dropped')) {
          autoAudioPlay();
        }
      });
    });

    // Unit 첫 문제가 아니면 자동 재생 (Unit 첫 문제는 unitIntro에서 시작)
    if (!isUnitFirst) {
      autoAudioPlay();
    }
  };

  const setupInteract = () => {
    if (!window.interact) {
      // console.warn('interact.js가 로드되지 않았습니다.');
      return;
    }

    // 기존 인스턴스 정리
    if (interactInstanceRef.current) {
      interactInstanceRef.current = null;
    }

    droppedRef.current = false;

    // 드래그 가능한 아이템 설정
    const draggableInstance = window.interact('.item').draggable({
		modifiers: [
        window.interact.modifiers.restrictRect({
			restriction: '.scale_container',
			endOnly: true,
		}),
		],
		listeners: {
        start(_event: any) {
          droppedRef.current = false;
			},
        move(event: any) {
				const target = event.target;

          const transform = window.getComputedStyle(document.querySelector('.scale_container')!).transform;
          let scaleX = 1,
            scaleY = 1;
				if (transform && transform !== 'none') {
					const match = transform.match(/matrix\((.+)\)/);
					if (match) {
						const values = match[1].split(',');
						scaleX = parseFloat(values[0]);
						scaleY = parseFloat(values[3]);
					}
				}

				const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx / scaleX;
				const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy / scaleY;

				target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x.toString());
          target.setAttribute('data-y', y.toString());
        },
        end(event: any) {
          if (!droppedRef.current && event.target) {
            const target = event.target as HTMLElement;
					target.style.transition = 'transform 0.3s ease';
					target.style.transform = 'translate(0px, 0px)';
            target.setAttribute('data-x', '0');
            target.setAttribute('data-y', '0');

					setTimeout(() => {
						target.style.transition = '';
					}, 300);
				}
			},
		},
	});

    // 드롭 존 설정
    window.interact('.drop_zone').dropzone({
		accept: '.item',
		overlap: 0.75,
      ondrop(event: any) {
        if (!event || !event.relatedTarget || !event.target) return;

        const draggableElement = event.relatedTarget as HTMLElement;
        const dropzoneElement = event.target as HTMLElement;

			const droppedId = draggableElement.id;
        const acceptId = dropzoneElement.getAttribute('data-accept');

			if (droppedId === acceptId) {
          // 정답 처리 - 중복 호출 방지
          if (audioCallbackLockRef.current) return;
          audioCallbackLockRef.current = true;
          
          droppedRef.current = true;

				dropzoneElement.classList.add('dropped');
				dropzoneElement.innerHTML = '';
				const group = document.createElement('div');
				Object.assign(draggableElement.style, {
					position: 'relative',
					top: '0px',
					left: '0px',
            transform: 'translate(0, 0)',
				});
          draggableElement.setAttribute('data-x', '0');
          draggableElement.setAttribute('data-y', '0');
				group.appendChild(draggableElement);
				dropzoneElement.appendChild(group);

          document.querySelectorAll('.item').forEach((el) => {
            if (el !== draggableElement) (el as HTMLElement).style.display = 'none';
          });

          const itemBox = document.getElementById('itemBox');
          if (itemBox) itemBox.classList.add('dropped');

          // 폭죽
          confetti();

          // 다음 문제로 이동
          const currentLevelFromBox = itemBox?.dataset.currentBookSeq || currentLevel;
          const currentUnitFromBox = itemBox?.dataset.currentUnitSeq || currentUnit;
          const currentProblemNumberFromBox = itemBox?.dataset.currentQuizSeq || currentProblemNumber;
          
          // 현재 Unit의 마지막 문제번호 가져오기
          const currentUnitLastProblemNumber = getLastProblemNumberForUnit(
            quizDataListRef.current,
            currentLevelFromBox,
            currentUnitFromBox
          );
          
          const isLastUnit = parseInt(currentUnitFromBox) >= lastUnitRef.current;
          const isLastQuiz = parseInt(currentProblemNumberFromBox) >= currentUnitLastProblemNumber;
          const nextUnit = isLastQuiz ? parseInt(currentUnitFromBox) + 1 : parseInt(currentUnitFromBox);
          const nextProblemNumber = isLastQuiz ? 1 : parseInt(currentProblemNumberFromBox) + 1;

          // console.log('다음 문제로 이동:', {
          //   currentLevel: currentLevelFromBox,
          //   currentUnit: currentUnitFromBox,
          //   currentProblemNumber: currentProblemNumberFromBox,
          //   nextUnit,
          //   nextProblemNumber,
          //   isLastUnit,
          //   isLastQuiz,
          //   quizDataListLength: quizDataListRef.current.length
          // });

          const goNextStep = () => {
            console.log('goNextStep 호출, 데이터 개수:', quizDataListRef.current.length);
            // Unit이 바뀌면 unitIntro를 띄우기 위해 플래그 전달
            const isUnitChanged = parseInt(currentUnitFromBox) !== nextUnit;
            getQuizInfo(currentLevelFromBox, nextUnit.toString(), nextProblemNumber.toString(), quizDataListRef.current, isUnitChanged);
          };

				const MIN_DELAY_MS = 500;
          const player = document.getElementById('player') as HTMLAudioElement;

				const safeNext = () => {
            if (nextLockedRef.current) return;
            nextLockedRef.current = true;

            if (isLastUnit && isLastQuiz) {
              setShowQuizFinal(true);
						return;
					}

            // confetti는 자동으로 정리되므로 reset 불필요

					goNextStep();
				};

				if (player) {
            const answerMp3 = itemBox?.dataset.src || '';
            
            // 현재 재생 중인 오디오가 있으면 끝날 때까지 기다림
            let waitCallbackCalled = false;
            const waitForCurrentAudio = (callback: () => void) => {
              if (waitCallbackCalled) return;
              
              if (player.paused || !player.src) {
                // 재생 중이 아니면 바로 콜백 실행
                waitCallbackCalled = true;
                callback();
                return;
              }

              // 현재 오디오가 끝날 때까지 기다림
              const onEnded = () => {
                if (waitCallbackCalled) return;
                waitCallbackCalled = true;
						player.removeEventListener('ended', onEnded);
                callback();
              };
              
              player.addEventListener('ended', onEnded, { once: true });
            };

            // 현재 오디오가 끝나면 정답 오디오 재생
            waitForCurrentAudio(() => {
              if (answerMp3) {
                playAudio(answerMp3, () => {
                  // 정답 오디오가 끝나면 다음 문제로 이동
						setTimeout(() => {
							safeNext();
						}, MIN_DELAY_MS);
                });
              }
              else {
                setTimeout(safeNext, MIN_DELAY_MS);
              }
            });
          }
          else {
					setTimeout(safeNext, MIN_DELAY_MS);
				}
			} else {
          // 오답 처리
          droppedRef.current = false;
				dropzoneElement.classList.add('wrong');
          setTimeout(() => dropzoneElement.classList.remove('wrong'), 400);
        }
      },
    });

    interactInstanceRef.current = draggableInstance;
  };

  const handleQuizFinalClose = () => {
    navigate(`/select-play/${level}/${unit}`);
  };

  return (
    <>
      <div className="landscape_warning"></div>
      <div className="wrap puzzle" id="container">
        <canvas id="gameCanvas"></canvas>
        <div id="scaleContainer" className="scale_container">
          <div id="spinner" style={{ display: 'none' }}></div>

          {showTutorial && (
            <div className="tutorial puzzle">
              <button type="button" id="tutorialBtn" className="btn_close" onClick={handleTutorialClose}></button>
            </div>
          )}

          {showUnitIntro && (
            <div id="unitIntro" className="unit_intro">
              <p>
                Unit <strong id="unitSeq">{currentUnit}</strong>
              </p>
              <button type="button" id="unitIntroBtn" className="start" onClick={handleUnitIntroStart}>
                <img src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/btn_start.svg" alt="Start" />
              </button>
            </div>
          )}

          <div id="quizContainer" dangerouslySetInnerHTML={{ __html: quizContent }} />

          {showQuizFinal && (
            <div id="quizFinal" className="quiz_complete">
              <p>Good Job!</p>
              <button type="button" className="btn_close" onClick={handleQuizFinalClose}>
                close
              </button>
            </div>
          )}
        </div>
      </div>
      <audio id="player" playsInline></audio>
    </>
  );
};

export default ShadowPuzzle;
