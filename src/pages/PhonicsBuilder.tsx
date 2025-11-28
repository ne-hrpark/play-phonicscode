import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { initCommonScripts } from '../utils/common';
import { loadQuizDataFromExcel, findQuizData, getLastSequences, getLastProblemNumberForUnit, getRandomOptions, type QuizData } from '../utils/excelData';

// playAudio 함수 (PhonicsBuilder 전용)
const playAudio = (src: string | null, onEnded?: () => void, onPlay?: () => void) => {
  const player = document.getElementById('player') as HTMLAudioElement;
  if (!player) {
    console.error('player 요소를 찾을 수 없습니다.');
    return;
  }

  // 기존 ended 핸들러 제거
  if ((player as any)._onEndedHandler) {
    player.removeEventListener('ended', (player as any)._onEndedHandler);
    (player as any)._onEndedHandler = null;
  }

  // 항상 현재 재생 중단
  player.pause();
  player.currentTime = 0;

  // src 없으면 멈춤만
  if (!src) {
    player.removeAttribute('src');
    player.load();
    return;
  }

  // 새 src 설정
  player.src = src;
  player.load();

  // ended 콜백 등록
  if (typeof onEnded === 'function') {
    (player as any)._onEndedHandler = onEnded;
    player.addEventListener('ended', (player as any)._onEndedHandler, { once: true });
  }

  player
    .play()
    .then(() => {
      // mute 상태에서 일단 재생 성공했으면
      player.pause();
      // 다시 재생
      player
        .play()
        .then(() => {
          // 재생 시작 시 콜백 실행
          if (typeof onPlay === 'function') {
            onPlay();
          }
        })
        .catch((_err) => {
          //console.warn('unmute 재생 실패:', _err);
          if (onEnded) onEnded();
        });
    })
    .catch((_err) => {
      //console.warn('첫 재생 실패:', _err);
      if (onEnded) onEnded();
    });
};

declare global {
  interface Window {
    Swiper: any;
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


const PhonicsBuilder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // URL 파라미터는 기존과 호환성을 위해 유지하되, 내부적으로는 level, unit, problem_number 사용
  const level = searchParams.get('book_seq') || searchParams.get('level') || '1'; // book_seq를 level로 매핑
  const unit = searchParams.get('unit_seq') || searchParams.get('unit') || '1';
  const problemNumber = searchParams.get('quiz_seq') || searchParams.get('problem_number') || '1';

  const [showTutorial, setShowTutorial] = useState(false);
  const [showUnitIntro, setShowUnitIntro] = useState(false);
  const [showQuizFinal, setShowQuizFinal] = useState(false);
  const [builderContent, setBuilderContent] = useState('');
  const [currentLevel, setCurrentLevel] = useState(level);
  const [currentUnit, setCurrentUnit] = useState(unit);
  const [currentProblemNumber, setCurrentProblemNumber] = useState(problemNumber);
  const [quizDataList, setQuizDataList] = useState<QuizData[]>([]);
  const [_isLoading, setIsLoading] = useState(true);

  const swiperRef = useRef<any>(null);
  const answeredRef = useRef(false);
  const nextLockedRef = useRef(false);
  const lastUnitRef = useRef(0);
  const lastProblemNumberRef = useRef(0);
  const answerWordRef = useRef('');
  const answerAudioSrcRef = useRef('');

  // 닫기 버튼 이벤트 바인딩 (builderContent 변경 시)
  useEffect(() => {
    if (!builderContent) return;

    // DOM이 완전히 업데이트될 때까지 대기
    const timeoutId = setTimeout(() => {
      const handleCloseClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target && (target.id === 'btnClose' || target.closest('#btnClose'))) {
          e.preventDefault();
          e.stopPropagation();
          navigate(`/select-play?book_seq=${level}&unit_seq=${unit}`);
        }
      };

      const builderContainer = document.getElementById('builderContainer');
      if (builderContainer) {
        // 기존 리스너 제거 후 새로 등록
        builderContainer.removeEventListener('click', handleCloseClick);
        builderContainer.addEventListener('click', handleCloseClick);
      }
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [builderContent, level, unit, navigate]);

  useEffect(() => {
    initCommonScripts();
    initTutorialState();
    
    // 엑셀 데이터 로드
    loadQuizDataFromExcel('/data/quiz_data.xls')
      .then((data) => {
        setQuizDataList(data);
        setIsLoading(false);
        // 문제 번호가 '1'이면 Unit Intro를 표시하기 위해 isUnitFirst를 true로 전달
        const isUnitFirst = problemNumber === '1';
        getQuizInfo(level, unit, problemNumber, isUnitFirst, data);
      })
      .catch((error) => {
        console.error('엑셀 데이터 로드 실패:', error);
        setIsLoading(false);
        // 기본 데이터로 폴백
        const isUnitFirst = problemNumber === '1';
        getQuizInfo(level, unit, problemNumber, isUnitFirst, []);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, unit, problemNumber]);

  const initTutorialState = () => {
    const hidden = getCookie('tutorialHide') === 'true';
    setShowTutorial(!hidden);
    setShowUnitIntro(hidden);
  };

  const handleTutorialClose = () => {
    setCookie('tutorialHide', 'true', 30);
    setShowTutorial(false);
    setShowUnitIntro(true);
    startAudioOnClick();
  };

  const handleUnitIntroStart = () => {
    setShowUnitIntro(false);
    // DOM 업데이트 후 swiper 생성 및 슬롯 모션 시작
    setTimeout(() => {
      createSwiper();
    }, 150);
  };

  const startAudioOnClick = () => {
    // Unit 첫 문제 시작 시 슬롯 오디오 재생
    // createSwiper는 handleUnitIntroStart나 wireUpAudioAndNext에서 호출됨
  };

  const handleClose = () => {
    navigate(`/select-play?book_seq=${level}&unit_seq=${unit}`);
  };

  const getQuizInfo = (levelStr: string, unitStr: string, problemNumberStr: string, isUnitFirst = true, data: QuizData[] = quizDataList) => {
    // 현재 level과 unit의 문제 개수 계산
    const levelNum = parseInt(levelStr, 10);
    const unitNum = parseInt(unitStr, 10);
    const quizCount = data.filter(
      (item) => item.level === levelNum && item.unit === unitNum
    ).length;
    
    // 마지막 문제 번호 가져오기
    const lastProblemNumberForUnit = getLastProblemNumberForUnit(data, levelStr, unitStr);
    
    console.log(`[Level ${levelNum}, Unit ${unitNum}] 문제 개수: ${quizCount}개, 마지막 문제 번호: ${lastProblemNumberForUnit}`);
    
    // 엑셀 데이터에서 퀴즈 찾기
    const quizData = findQuizData(data, levelStr, unitStr, problemNumberStr);
    
    if (!quizData) {
      alert('해당 문제를 찾을 수 없습니다. \n첫 번째 문제부터 다시 시작해 주세요.');
      navigate('/select-play');
      return;
    }

    // 콘솔에 엑셀 데이터 정보 출력
    // console.log('=== 퀴즈 데이터 정보 ===');
    // console.log('레벨:', quizData.level);
    // console.log('유닛:', quizData.unit);
    // console.log('문제번호:', quizData.problem_number);
    // console.log('정답(음가):', quizData.answer_phonetic);
    // console.log('단어:', quizData.word);
    // console.log('슬롯 문자 시작:', quizData.slot_char_start);
    // console.log('슬롯 문자 종료:', quizData.slot_char_end);
    // console.log('색상 표시 시작:', quizData.color_display_start);
    // console.log('색상 표시 개수:', quizData.color_display_count);
    // console.log('정답 이미지 경로:', quizData.correct_image_path);
    // console.log('그림자 이미지 경로:', quizData.shadow_image_path);
    // console.log('정답 음원 경로:', quizData.correct_audio_path);
    // console.log('타겟음가:', quizData.target_phonetic);
    // console.log('전체 데이터:', quizData);
    // console.log('========================');

    // 마지막 unit와 problem_number 가져오기
    const { lastUnit } = getLastSequences(data, levelStr);
    
    // 실제 문제 개수를 마지막 문제 번호로 사용 (문제 번호가 연속적이지 않을 수 있음)
    const actualLastProblemNumber = quizCount;

    // 같은 레벨, 같은 유닛에서 랜덤 보기 생성 (정답 제외)
    const randomOptions = getRandomOptions(data, quizData.level, quizData.unit, quizData.answer_phonetic, 4);
    
    // 정답을 포함한 모든 옵션 (정답 + 랜덤 보기)
    const allOptions = [quizData.answer_phonetic, ...randomOptions];
    // 랜덤으로 섞기
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

    // swiper-slide 생성 (랜덤 옵션 사용)
    const swiperSlidesHtml = shuffledOptions
      .map((option, index) => {
        const isAnswer = option === quizData.answer_phonetic;
        // 오디오 경로 생성 (음가별로 sound/B{level}/{level}_{phonetic}.mp3 형식 가정)
        const audioPath = `sound/B${quizData.level}_${option}.mp3`;
        const audioSrc = `https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/${audioPath}`;
        
        return `<div class="swiper-slide" data-audio-src="${audioSrc}" data-answeryn="${isAnswer ? 'Y' : 'N'}" data-swiper-slide-index="${index}"><span>${option}</span></div>`;
      })
      .join('');

    // 이미지 URL 생성 (엑셀에 전체 URL이 없으면 기본 경로 사용)
    const imageUrl = quizData.correct_image_path.startsWith('http')
      ? quizData.correct_image_path
      : `https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/${quizData.correct_image_path}`;

    // ASP 로직과 동일하게 단어를 문자 하나씩 순회하면서 슬롯 삽입
    const word = quizData.word;
    const slotStartIdx = quizData.slot_char_start; // 1-based index (ASP의 rs_slot_start_idx + 1과 동일)
    const slotSize = quizData.slot_char_end - quizData.slot_char_start + 1; // 슬롯 크기
    const colorStartIdx = quizData.color_display_start || 0; // 1-based index
    const colorSize = quizData.color_display_count || 0;

    // word_box 내부 HTML 생성 (ASP 로직과 동일)
    let wordBoxInnerHtml = '';
    let openedDefault = false;
    let i = 1; // 1-based index (ASP와 동일)

    while (i <= word.length) {
      // 슬롯 시작 위치 (ASP: i = rs_slot_start_idx + 1, 여기서는 slotStartIdx가 이미 +1된 값)
      if (i === slotStartIdx) {
        // 앞쪽 word_default 닫기
        if (openedDefault) {
          wordBoxInnerHtml += '</div>';
          openedDefault = false;
        }

        // 슬롯 출력
        wordBoxInnerHtml += `<div class="swiper_wrap">
          <div class="swiper swiper-container-initialized swiper-container-vertical">
            <div class="swiper-wrapper">
              ${swiperSlidesHtml}
            </div>
          </div>
        </div>`;

        // 슬롯만큼 건너뛰기
        i = i + slotSize;

        // 뒤쪽에 문자가 남아 있으면 word_default 다시 열기
        if (i <= word.length) {
          wordBoxInnerHtml += '<div class="word_default">';
          openedDefault = true;
        }
      } else {
        // 고정문자 시작 시 word_default 열기
        if (!openedDefault) {
          wordBoxInnerHtml += '<div class="word_default">';
          openedDefault = true;
        }

        const oneChar = word.charAt(i - 1); // 0-based index로 변환
        const slotCharStart = slotStartIdx; // 슬롯 문자 시작 위치 (1-based)
        const slotCharEnd = slotStartIdx + slotSize - 1; // 슬롯 문자 종료 위치 (1-based)
        
        // 슬롯 문자 시작/종료 위치에 <em> 태그 추가
        // 예: tall에서 시작이 1, 종료가 2라면 → <em>ta</em>ll
        if (i === slotCharStart) {
          // 슬롯 문자 시작 위치에서 <em> 시작
          wordBoxInnerHtml += `<span class="word"><em>${oneChar}`;
        } else if (i === slotCharEnd) {
          // 슬롯 문자 종료 위치에서 <em> 종료
          wordBoxInnerHtml += `${oneChar}</em></span>`;
        } else if (i > slotCharStart && i < slotCharEnd) {
          // 슬롯 문자 중간
          wordBoxInnerHtml += oneChar;
        } else {
          // 슬롯 문자가 아닌 일반 문자
          // 색상 표시 (기존 로직 유지)
          if (colorStartIdx > 0 && i > colorStartIdx && i <= (colorStartIdx + colorSize)) {
            wordBoxInnerHtml += `<span class="word"><em>${oneChar}</em></span>`;
          } else {
            wordBoxInnerHtml += `<span class="word">${oneChar}</span>`;
          }
        }

        i = i + 1;
      }
    }

    // 마지막 word_default 닫기
    if (openedDefault) {
      wordBoxInnerHtml += '</div>';
    }

    // 정답 오디오 경로 (사용하지 않음)
    // const answerAudioPath = quizData.correct_audio_path.startsWith('http')
    //   ? quizData.correct_audio_path
    //   : `https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/${quizData.correct_audio_path}`;

    // HTML 생성
    const builderHtml = `
      <header class="play_header">
        <span class="pagination"><strong>${problemNumberStr}</strong>/${actualLastProblemNumber}</span>
        <a href="#" class="btn_close" id="btnClose">닫기</a>
      </header>
      <div class="q_img">
        <div class="img_box"><img src="${imageUrl}" alt="${quizData.word}"></div>
        <button type="button" id="btnAudio" class="btn_audio builder show">
          <svg xmlns="http://www.w3.org/2000/svg" width="58.38" height="48.667" viewBox="0 0 58.38 48.667">
            <path id="speaker" d="M29.3,1.957A1.954,1.954,0,0,0,26.031.516L14.651,10.928V10.74H1.953A1.953,1.953,0,0,0,0,12.694V35.973a1.954,1.954,0,0,0,1.953,1.953h12.7v-.188L26.031,48.151A1.954,1.954,0,0,0,29.3,46.709Z"></path>
            <path class="line1" d="M201.347,112.335a2.22,2.22,0,0,1-1.419-3.928,3.535,3.535,0,0,0,1.194-2.668,4.138,4.138,0,0,0-1.267-3.138,2.22,2.22,0,1,1,2.983-3.288,8.632,8.632,0,0,1,2.723,6.523,7.962,7.962,0,0,1-2.8,5.987,2.211,2.211,0,0,1-1.417.512" transform="translate(-163.763 -81.203)"></path>
            <path class="line2" d="M236.564,97.543a2.22,2.22,0,0,1-1.552-3.807,9.138,9.138,0,0,0,0-14.131,2.22,2.22,0,0,1,3.1-3.174,13.544,13.544,0,0,1,0,20.48,2.213,2.213,0,0,1-1.552.633" transform="translate(-192.727 -62.337)"></path>
            <path class="line3" d="M271.265,83.174a2.22,2.22,0,0,1-1.45-3.9,13.773,13.773,0,0,0,0-21.856,2.22,2.22,0,0,1,2.9-3.364,18.2,18.2,0,0,1,0,28.584,2.211,2.211,0,0,1-1.448.538" transform="translate(-221.265 -44.011)"></path>
          </svg>
        </button>
      </div>
      <div class="word_box_warp">
        <div id="itemBox" class="word_box" data-last-unit-seq="${lastUnit}" data-last-quiz-seq="${actualLastProblemNumber}" data-current-book-seq="${levelStr}" data-current-unit-seq="${unitStr}" data-current-quiz-seq="${problemNumberStr}" data-answer-word="${quizData.word}" data-answer-audio="${quizData.correct_audio_path}">
          ${wordBoxInnerHtml}
        </div>
      </div>
    `;

    setBuilderContent(builderHtml);
            setTimeout(() => {
              // 닫기 버튼 이벤트 바인딩 (이벤트 위임 사용)
              const builderContainer = document.getElementById('builderContainer');
              if (builderContainer) {
                // 기존 이벤트 리스너 제거 후 새로 등록
                const handleCloseClick = (e: Event) => {
                  const target = e.target as HTMLElement;
                  if (target && (target.id === 'btnClose' || target.closest('#btnClose'))) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClose();
                  }
                };
                
                // 기존 리스너 제거
                builderContainer.removeEventListener('click', handleCloseClick);
                // 새 리스너 등록
                builderContainer.addEventListener('click', handleCloseClick);
              }
              wireUpAudioAndNext(isUnitFirst);
            }, 100);
  };

  const wireUpAudioAndNext = (isUnitFirst: boolean) => {
    answeredRef.current = false;
    nextLockedRef.current = false;

    const itemBox = document.getElementById('itemBox');
    if (itemBox) {
      answerWordRef.current = itemBox.dataset.answerWord || '';
      answerAudioSrcRef.current =
        'https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/' +
        (itemBox.dataset.answerAudio || '');

      lastUnitRef.current = parseInt(itemBox.dataset.lastUnitSeq || '0', 10);
      lastProblemNumberRef.current = parseInt(itemBox.dataset.lastQuizSeq || '0', 10);
      
      // dataset에서 직접 값을 가져와서 사용 (state는 비동기 업데이트이므로)
      const currentLevelFromBox = itemBox.dataset.currentBookSeq || '1';
      const currentUnitFromBox = itemBox.dataset.currentUnitSeq || '1';
      const currentProblemNumberFromBox = itemBox.dataset.currentQuizSeq || '1';
      
      setCurrentLevel(currentLevelFromBox);
      setCurrentUnit(currentUnitFromBox);
      setCurrentProblemNumber(currentProblemNumberFromBox);

      // isUnitFirst가 true이고 문제 번호가 '1'이면 Unit Intro 표시
      if (isUnitFirst && currentProblemNumberFromBox === '1') {
        const unitSeqEl = document.getElementById('unitSeq');
        if (unitSeqEl) unitSeqEl.innerText = currentUnitFromBox;
        setShowUnitIntro(true);
        // unitIntro가 표시되면 handleUnitIntroStart에서 createSwiper 호출
      } else {
        // unitIntro가 없으면 바로 swiper 생성
        setTimeout(() => {
          createSwiper();
        }, 100);
      }
      
      // nextLockedRef 초기화 (새 문제 로드 시)
      nextLockedRef.current = false;
    }

    // word_default div 생성
    const itemBoxes = document.querySelectorAll('.word_box');
    itemBoxes.forEach((box) => {
      const swipers = box.querySelectorAll('.swiper_wrap');

      swipers.forEach((swiper) => {
        // 왼쪽 word div 수집
        const leftWords: Element[] = [];
        let prev = swiper.previousSibling;
        while (prev) {
          if (prev.nodeType === 1 && (prev as Element).classList.contains('word')) {
            leftWords.unshift(prev as Element);
          }
          prev = prev.previousSibling;
        }

        if (leftWords.length > 0) {
          const leftDiv = document.createElement('div');
          leftDiv.className = 'word_default';
          leftWords.forEach((el) => leftDiv.appendChild(el));
          swiper.parentNode?.insertBefore(leftDiv, swiper);
        }

        // 오른쪽 word div 수집
        const rightWords: Element[] = [];
        let next = swiper.nextSibling;
        while (next) {
          if (next.nodeType === 1 && (next as Element).classList.contains('word')) {
            rightWords.push(next as Element);
          }
          next = next.nextSibling;
        }

        if (rightWords.length > 0) {
          const rightDiv = document.createElement('div');
          rightDiv.className = 'word_default';
          rightWords.forEach((el) => rightDiv.appendChild(el));
          swiper.parentNode?.insertBefore(rightDiv, swiper.nextSibling);
        }
      });
    });

    // jQuery 코드를 순수 JavaScript로 변환
    const $ = window.$ || window.jQuery;
    if ($) {
      const slideCharCnt = $('.swiper-slide[data-answeryn="Y"]').first().text().replace(/<[^>]+>/g, '');
      const wordDefaultCharCnt = $('.word_default .word');
      const plainText = answerWordRef.current.replace(/<[^>]+>/g, '');
      const charCount = plainText.length;

      const $builder = $('.builder');
      const $wordDefaults = $builder.find('.word_default');
      const $swiperWrap = $builder.find('.swiper_wrap');

      if ($wordDefaults.find('.word').text().trim().length > 6) {
        $swiperWrap.addClass('min_w_auto');
      } else {
        $swiperWrap.removeClass('min_w_auto');
      }

      if (charCount !== 1 && charCount !== 7 && slideCharCnt.length > wordDefaultCharCnt.length) {
        $wordDefaults.css('flex', '');
        $swiperWrap.css('flex', '2');
      } else if (
        (slideCharCnt.length === 1 && wordDefaultCharCnt.length === 1) ||
        (slideCharCnt.length === 2 && wordDefaultCharCnt.length === 2)
      ) {
        $wordDefaults.css('flex', '1');
        $swiperWrap.css({
          flex: '1',
          padding: '0 30px',
        });
      } else {
        $wordDefaults.css('flex', '');
        $swiperWrap.css({
          flex: '',
          padding: '0',
        });
      }

      const wordDefaultOne = $wordDefaults.eq(0).find('.word').text().trim();
      const wordDefaultTwo = $wordDefaults.eq(1).find('.word').text().trim();
      const swiperWrapText = $swiperWrap.find('.swiper-slide[data-answeryn="Y"]').first().text().trim();

      if (wordDefaultOne.length === 1 && swiperWrapText.length === 1 && wordDefaultTwo.length === 2) {
        $wordDefaults.eq(1).css('flex', '2');
      } else {
        $wordDefaults.eq(1).css('flex', '1');
      }
    }

    // 이미지 클릭 오디오
    const qImg = document.querySelector('.q_img');
    const btnAudio = document.getElementById('btnAudio');

    if (qImg) {
      qImg.addEventListener('click', () => {
        if (btnAudio) btnAudio.classList.add('animate');
        playAudio(answerAudioSrcRef.current, () => {
          if (btnAudio) btnAudio.classList.remove('animate');
        });
      });
    }

    // startAudioOnClick은 더 이상 필요하지 않음 (createSwiper에서 처리)
  };

  const startSlotSpin = (swiper: any, target = 0, opts: any = {}) => {
    const {
      fastStepDelay = 1000,
      fastDuration = 800,
      decelSteps = [120, 160, 210, 270, 340],
      stepSpeed = 1000,
      finalSpeed = 800,
    } = opts;

    swiper._readyForEvents = false;
    swiper._spinning = true;

    const fastEnd = performance.now() + fastDuration;

    function spinFast() {
      if (!swiper || swiper.destroyed) return;
      swiper.slideNext(stepSpeed, false);
      if (performance.now() < fastEnd) {
        setTimeout(spinFast, fastStepDelay);
      } else {
        spinDecel(0);
      }
    }

    function spinDecel(i: number) {
      if (!swiper || swiper.destroyed) return;
      if (i < decelSteps.length) {
        swiper.slideNext(stepSpeed + i * 70, false);
        setTimeout(() => spinDecel(i + 1), decelSteps[i]);
      } else {
        requestAnimationFrame(() => {
          swiper.slideToLoop(target, finalSpeed, false);
          setTimeout(() => {
            swiper._spinning = false;
            swiper._readyForEvents = true;
            if (typeof swiper.onSlotSpinEnd === 'function') {
              swiper.onSlotSpinEnd(swiper);
            }
          }, finalSpeed + 60);
        });
      }
    }

    spinFast();
  };

  const createSwiper = () => {
    if (swiperRef.current && swiperRef.current.destroy) {
      try {
        swiperRef.current.destroy(true, true);
      } catch (e) {
        console.error(e);
      }
      swiperRef.current = null;
    }

    const swiperEl = document.querySelector('.swiper');
    if (!swiperEl || !window.Swiper) return null;

    swiperRef.current = new window.Swiper(swiperEl, {
      direction: 'vertical',
      slidesPerView: 'auto',
      loop: true,
      centeredSlides: true,
      centeredSlidesBounds: true,
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      observer: true,
      observeParents: true,
      loopAdditionalSlides: 1,
      speed: 300,
      on: {
        init: function (this: any) {
          playAudio(
            'https://upfile.neungyule.com/file_nebuildandgrow_co_kr/play/phonicscode/slotmachine2.mp3'
          );

          this.isSlotSpinning = true;
          this._handleCheckAnswer = () => checkAnswer(this);
          this._handleSlideChange = () => {
            // 슬라이드 변경 시 오디오 재생 (슬롯 스핀 중이 아닐 때만)
            if (!this.isSlotSpinning) {
              const activeSlide = this.slides[this.activeIndex];
              if (activeSlide) {
                const audioSrc = activeSlide.dataset.audioSrc;
                if (audioSrc) {
                  // 오디오 재생
                  playAudio(audioSrc);
                }
              }
            }
            // 정답 체크도 수행
            this._handleCheckAnswer();
          };

          // slideChange 이벤트 등록
          this.on('slideChange', this._handleSlideChange);

          const el = this.el;
          const armByUser = () => {
            if (this.isSlotSpinning) {
              this.isSlotSpinning = false;
              if (typeof this.onSlotSpinEnd === 'function') {
                this.onSlotSpinEnd(this);
              }
            }
          };
          el.addEventListener('touchstart', armByUser, { passive: true });
          el.addEventListener('mousedown', armByUser);
          el.addEventListener('wheel', armByUser, { passive: true });

          const target = 0;

          if (typeof startSlotSpin === 'function') {
            startSlotSpin(this, target, {
              fastStepDelay: 50,
              fastDuration: 60,
              decelSteps: [80, 110, 150, 180, 220],
              stepSpeed: 50,
              finalSpeed: 350,
            });
          }

          this.onSlotSpinEnd = (inst: any) => {
            const player = document.getElementById('player') as HTMLAudioElement;
            if (player) {
              player.pause();
              player.currentTime = 0;
            }

            const $ = window.$ || window.jQuery;
            if ($) {
              $('.swiper').addClass('ani_complete');
              $('.q_img').removeClass('disabled');
              $('#btnAudio').addClass('show');
            }
            inst.isSlotSpinning = false;
          };
        },
      },
    });
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const checkAnswer = (swiper: any) => {
    if (answeredRef.current) return;
    if (swiper.isSlotSpinning) return;

    const activeSlide = swiper.slides[swiper.activeIndex];
    if (!activeSlide) return;

    const activeSpan = activeSlide.querySelector('span');
    const activeText = (activeSpan ? activeSpan.textContent : '').trim();

    const itemBox = activeSlide.closest('.word_box') as HTMLElement | null;
    if (!itemBox) return;

    const isCorrect = activeSlide.dataset.answeryn === 'Y';
    const optionAudioSrc =
      activeSlide?.dataset.audioSrc || (activeSpan as HTMLElement)?.dataset.audioSrc;

    if (isCorrect) {
      answeredRef.current = true;

      swiper.allowTouchMove = false;
      swiper.allowSlideNext = false;
      swiper.allowSlidePrev = false;

      const $ = window.$ || window.jQuery;
      if ($) {
        $('#builderContainer').addClass('disabled');
      }

      const blocks = Array.from(itemBox.querySelectorAll('.word_default, .swiper_wrap')) as Element[];
      let fullText = '';

      blocks.forEach((block: Element) => {
        if (block.classList.contains('word_default')) {
          const words = Array.from(block.querySelectorAll('.word')) as Element[];
          words.forEach((w: Element) => {
            const em = w.querySelector('em');
            const textVal = em ? em.outerHTML : w.textContent;
            fullText += textVal;
          });
        } else if (block.classList.contains('swiper_wrap')) {
          fullText += `<em>${activeText}</em>`;
        }
      });

      const currentLevelFromBox = itemBox?.dataset.currentBookSeq || currentLevel;
      const currentUnitFromBox = itemBox?.dataset.currentUnitSeq || currentUnit;
      const currentProblemNumberFromBox = itemBox?.dataset.currentQuizSeq || currentProblemNumber;

      // 현재 Unit의 실제 문제 개수 가져오기 (마지막 문제 번호 대신 사용)
      const currentLevelNum = parseInt(currentLevelFromBox, 10);
      const currentUnitNum = parseInt(currentUnitFromBox, 10);
      const currentUnitLastProblemNumber = quizDataList.filter(
        (item) => item.level === currentLevelNum && item.unit === currentUnitNum
      ).length;
      
      const isLastUnit = parseInt(currentUnitFromBox) >= lastUnitRef.current;
      const isLastQuiz = parseInt(currentProblemNumberFromBox) >= currentUnitLastProblemNumber;
      const nextUnit = isLastQuiz ? parseInt(currentUnitFromBox) + 1 : parseInt(currentUnitFromBox);
      const nextProblemNumber = isLastQuiz ? 1 : parseInt(currentProblemNumberFromBox) + 1;
      
      // Unit이 변경되었는지 확인
      const isUnitChanged = nextUnit !== parseInt(currentUnitFromBox);

      const goNextStep = () => getQuizInfo(currentLevelFromBox, nextUnit.toString(), nextProblemNumber.toString(), isUnitChanged, quizDataList);

      const MIN_DELAY_MS = 1000;

      const safeNext = () => {
        if (nextLockedRef.current) return;
        nextLockedRef.current = true;

        if (isLastUnit && isLastQuiz) {
          setShowQuizFinal(true);
          return;
        }

        goNextStep();
      };

      document.querySelector('.q_img')?.classList.add('disabled');
      document.querySelector('.btn_audio')?.classList.remove('show');

      // 1. 정답 슬라이드의 data-audio-src 오디오 재생
      const correctSlideAudioSrc = activeSlide?.dataset.audioSrc;
      if (correctSlideAudioSrc) {
        playAudio(correctSlideAudioSrc, () => {
          // 2. 정답 오디오 재생 (재생 시작 시 이벤트 실행)
          playAudio(
            answerAudioSrcRef.current,
            () => {
              // 정답 오디오가 끝난 후 다음 문제로 이동
              setTimeout(() => {
                safeNext();
              }, MIN_DELAY_MS);
            },
            () => {
              // 정답 오디오가 재생될 때 즉시 실행
              fireConfetti();
              if ($) {
                $('#builderContainer').removeClass('disabled');
              }
              itemBox.innerHTML = `<div class="word_default finished">${fullText}</div>`;
            }
          );
        });
      } else {
        // data-audio-src가 없으면 정답 오디오만 재생 (재생 시작 시 이벤트 실행)
        playAudio(
          answerAudioSrcRef.current,
          () => {
            // 정답 오디오가 끝난 후 다음 문제로 이동
            setTimeout(() => {
              safeNext();
            }, MIN_DELAY_MS);
          },
          () => {
            // 정답 오디오가 재생될 때 즉시 실행
            fireConfetti();
            if ($) {
              $('#builderContainer').removeClass('disabled');
            }
            itemBox.innerHTML = `<div class="word_default finished">${fullText}</div>`;
          }
        );
      }
    } else {
      if (answeredRef.current) return;

      if (optionAudioSrc) {
        const btnAudio = document.getElementById('btnAudio');
        if (btnAudio) {
          if (btnAudio.classList.contains('animate')) {
            btnAudio.classList.remove('animate');
          }
          playAudio(optionAudioSrc);
        }
      }
    }
  };

  const handleQuizFinalClose = () => {
    navigate(`/select-play?book_seq=${level}&unit_seq=${unit}`);
  };

  return (
    <>
      <div className="landscape_warning"></div>
      <div className="wrap builder" id="container">
        <canvas id="gameCanvas"></canvas>
        <div id="scaleContainer" className="scale_container">
          <div id="spinner" style={{ display: 'none' }}></div>

          {showTutorial && (
            <div className="tutorial builder">
              <button type="button" id="tutorialBtn" className="btn_close" onClick={handleTutorialClose}></button>
            </div>
          )}

          {showUnitIntro && (
            <div id="unitIntro" className="unit_intro">
              <p>
                Unit <strong id="unitSeq">{currentUnit}</strong>
              </p>
              <button type="button" id="unitIntroBtn" className="start" onClick={handleUnitIntroStart}>
                <img
                  src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/btn_start.svg"
                  alt="Start"
                />
              </button>
            </div>
          )}

          <div
            id="builderContainer"
            className="builder_container"
            dangerouslySetInnerHTML={{ __html: builderContent }}
          />

          {showQuizFinal && (
            <div id="quizFinal" className="quiz_complete">
              <p>Good Job!</p>
              <a href="#" className="btn_close" onClick={(e) => { e.preventDefault(); handleQuizFinalClose(); }}>
                close
              </a>
            </div>
          )}
        </div>
      </div>
      <audio id="player" playsInline></audio>
    </>
  );
};

export default PhonicsBuilder;
