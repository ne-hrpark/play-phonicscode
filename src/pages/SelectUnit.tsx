import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { initCommonScripts } from '../utils/common';
import { loadUnitDataFromExcel, getUnitsByLevel, type UnitData } from '../utils/unitData';

declare global {
  interface Window {
    Swiper: any;
    deviceType: string;
  }
}

const SelectUnit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookSeq = parseInt(searchParams.get('book_seq') || '1', 10);
  const swiperRef = useRef<any>(null);
  const autoEyeTimerRef = useRef<number | null>(null);
  const directionRef = useRef<number>(1);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // book_seq에 따른 primaryColor 설정
  const getPrimaryColor = (bookSeq: number): string => {
    switch (bookSeq) {
      case 1:
        return '#F3C74C'; // 1권
      case 2:
        return '#F2854D'; // 2권
      case 3:
        return '#78C15E'; // 3권
      case 4:
        return '#5CABE1'; // 4권
      case 5:
        return '#AA70C8'; // 5권
      default:
        return '#F3C74C'; // 기본값
    }
  };

  const primaryColor = getPrimaryColor(bookSeq);

  useEffect(() => {
    // 엑셀에서 유닛 데이터 로드
    loadUnitDataFromExcel('/data/unit_data.xlsx')
      .then((data) => {
        const levelUnits = getUnitsByLevel(data, bookSeq);
        setUnits(levelUnits);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('유닛 데이터 로드 실패:', error);
        setIsLoading(false);
        // 기본 데이터로 폴백
        setUnits([
          { level: bookSeq, unit: 1, unitName: 'Aa  Bb  Cc' },
          { level: bookSeq, unit: 2, unitName: 'Dd  Ee  Ff' },
          { level: bookSeq, unit: 3, unitName: 'Gg  Hh  Ii' },
          { level: bookSeq, unit: 4, unitName: 'Jj  Kk  Ll' },
          { level: bookSeq, unit: 5, unitName: 'Mm  Nn  Oo' },
          { level: bookSeq, unit: 6, unitName: 'Pp  Qq  Rr' },
          { level: bookSeq, unit: 7, unitName: 'Ss  Tt  Uu  Vv' },
          { level: bookSeq, unit: 8, unitName: 'Ww  Xx  Yy  Zz' },
        ]);
      });
  }, [bookSeq]);

  useEffect(() => {
    // CSS 변수로 primaryColor 설정
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    
    // 공통 스크립트 초기화
    initCommonScripts();
  }, [primaryColor]);

  // Swiper 초기화 및 눈동자 애니메이션 (units가 로드된 후)
  useEffect(() => {
    if (isLoading || !window.Swiper || units.length === 0) return;

    // 기존 Swiper 인스턴스 정리
    if (swiperRef.current && swiperRef.current.destroy) {
      try {
        swiperRef.current.destroy(true, true);
      } catch (e) {
        console.warn('Swiper destroy 오류:', e);
      }
      swiperRef.current = null;
    }

    // Swiper 요소가 DOM에 있는지 확인
    const swiperEl = document.querySelector('.swiper_unit');
    if (!swiperEl) return;

    // Swiper 초기화
    swiperRef.current = new window.Swiper('.swiper_unit', {
      slidesPerView: 'auto',
      spaceBetween: 20,
      slidesOffsetAfter: 0,
      centeredSlides: false,
      loop: false,
      freeMode: true,
      observer: true,
      observeParents: true,
    });

    const setupEyeAnimation = () => {
      const eyes = document.querySelectorAll('.eyes') as NodeListOf<SVGEllipseElement>;
      if (eyes.length === 0) return;

      // 현재 ellipse의 translate 기준값 추출
      function getBaseTransform(el: SVGEllipseElement) {
        const transform = el.getAttribute('transform');
        if (transform) {
          const match = transform.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
          if (match) {
            return {
              x: parseFloat(match[1]),
              y: parseFloat(match[2]),
            };
          }
        }
        return { x: 0, y: 0 };
      }

      // 초기 데이터 준비
      const eyeData = Array.from(eyes).map((el) => {
        const eyeContainer = el.closest('.eye_container') as SVGGElement;
        const eyeWhite = eyeContainer?.querySelector('.eye_white') as SVGCircleElement;
        const containerTransform = eyeContainer?.getAttribute('transform');

        let base = getBaseTransform(el);

        // matrix가 있는 경우 중앙 배치
        if (containerTransform && containerTransform.includes('matrix') && eyeWhite) {
          const bbox = eyeWhite.getBBox();
          const cx = el.cx.baseVal.value;
          const cy = el.cy.baseVal.value;
          base = {
            x: bbox.x + bbox.width / 2 - cx,
            y: bbox.y + bbox.height / 2 - cy,
          };
          el.setAttribute('transform', `translate(${base.x} ${base.y})`);
        }

        return { el, base, eyeWhite };
      });

      function startAutoEyeMove() {
        if (autoEyeTimerRef.current) return;

        autoEyeTimerRef.current = window.setInterval(() => {
          eyeData.forEach(({ el, base, eyeWhite }) => {
            if (!eyeWhite) return;

            let eyeWidth = 0;
            if (el.tagName.toLowerCase() === 'ellipse') {
              eyeWidth = el.rx ? el.rx.baseVal.value * 2 : 0;
            } else if (el.tagName.toLowerCase() === 'circle') {
              const circleEl = el as unknown as SVGCircleElement;
              eyeWidth = circleEl.r ? circleEl.r.baseVal.value * 2 : 0;
            }

            const bbox = eyeWhite.getBBox();
            let maxMove = bbox.width - eyeWidth;
            if (base.x < 0) maxMove = Math.abs(base.x) + maxMove;

            if (directionRef.current !== 1) {
              el.setAttribute('transform', `translate(${base.x} ${base.y})`);
            } else if (directionRef.current === 1) {
              el.setAttribute('transform', `translate(${base.x + maxMove} ${base.y})`);
            }
          });

          directionRef.current *= -1;
        }, 2000);
      }

      function stopAutoEyeMove() {
        if (autoEyeTimerRef.current) {
          clearInterval(autoEyeTimerRef.current);
          autoEyeTimerRef.current = null;
        }
      }

      // Swiper 터치 이벤트
      if (swiperRef.current && swiperRef.current.on) {
        swiperRef.current.on('slideChangeTransitionStart', function (this: any) {
          stopAutoEyeMove();

          const diff = this.touches?.diff || 0;

          eyeData.forEach(({ el, base, eyeWhite }) => {
            if (!eyeWhite) return;

            let eyeWidth = 0;
            if (el.tagName.toLowerCase() === 'ellipse') {
              eyeWidth = el.rx ? el.rx.baseVal.value * 2 : 0;
            } else if (el.tagName.toLowerCase() === 'circle') {
              const circleEl = el as unknown as SVGCircleElement;
              eyeWidth = circleEl.r ? circleEl.r.baseVal.value * 2 : 0;
            }

            const bbox = eyeWhite.getBBox();
            let maxMove = bbox.width - eyeWidth;

            if (base.x < 0) maxMove = Math.abs(base.x) + maxMove;

            if (diff > 0) {
              el.setAttribute('transform', `translate(${base.x} ${base.y})`);
            } else if (diff < 0) {
              el.setAttribute('transform', `translate(${base.x + maxMove} ${base.y})`);
            }
          });
        });

        swiperRef.current.on('slideChangeTransitionEnd', function () {
          startAutoEyeMove();
        });
      }

      // 초기 자동 눈동자 시작
      startAutoEyeMove();
    };

    // 눈동자 애니메이션 설정
    setTimeout(() => {
      setupEyeAnimation();
    }, 100);

    return () => {
      // cleanup
      if (autoEyeTimerRef.current) {
        clearInterval(autoEyeTimerRef.current);
        autoEyeTimerRef.current = null;
      }
      if (swiperRef.current && swiperRef.current.destroy) {
        try {
          // 이벤트 리스너 제거 후 destroy
          if (swiperRef.current.off) {
            swiperRef.current.off('slideChangeTransitionStart');
            swiperRef.current.off('slideChangeTransitionEnd');
          }
          swiperRef.current.destroy(true, true);
        } catch (e) {
          console.warn('Swiper cleanup 오류:', e);
        }
        swiperRef.current = null;
      }
    };
  }, [isLoading, units]);

  return (
    <>
      <div className="landscape_warning"></div>
      <div className="wrap select_unit" id="container">
        <canvas id="gameCanvas"></canvas>
        <div id="scaleContainer" className="scale_container">
          <Header bookSeq={bookSeq.toString()} showBackButton={true} />
          
          {/* character_box :: 눈동자 모션 */}
          <div className="character_box">
            <div className="character">
              <svg xmlns="http://www.w3.org/2000/svg" width="360" height="216" viewBox="0 0 360 216">
                <g transform="translate(-150.258 -248.956)">
                  <rect width="360" height="216" transform="translate(150.258 248.956)" fill="none" />
                  <g className="eye_container" transform="translate(198.258 277.143)">
                    <circle className="eye_white" cx="57" cy="57" r="57" fill="#fff" />
                    <ellipse
                      className="eyes"
                      cx="33"
                      cy="35"
                      rx="33"
                      ry="35"
                      transform="translate(0 25.813)"
                      fill="#43413f"
                    />
                  </g>
                  <g className="eye_container" transform="translate(347.979 277.143)">
                    <circle className="eye_white" cx="57" cy="57" r="57" fill="#fff" />
                    <ellipse
                      className="eyes"
                      cx="33"
                      cy="35"
                      rx="33"
                      ry="35"
                      transform="translate(0 25.813)"
                      fill="#43413f"
                    />
                  </g>
                  <path
                    d="M1051.044,2190.036c.688-4.529,3.113-15.6,11.4-14.089s11.086,12.579,22.489,11.069,21.159-10.969,30.146-5.938,8.616,29.385-5.439,38.644-24.145,9.862-30.8,8.855-17.032-7.346-22.1-15.9S1050.356,2194.564,1051.044,2190.036Z"
                    transform="translate(-757.028 -1769.785)"
                    fill="#43413f"
                  />
                </g>
              </svg>
            </div>
          </div>

          {/* swiper_wrap */}
          <div className="swiper_wrap">
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</div>
            ) : (
              <div className="swiper_unit">
                <div className="swiper-wrapper">
                  {units.map((unit) => (
                    <div key={unit.unit} className="swiper-slide">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/select-play?book_seq=${bookSeq}&unit_seq=${unit.unit}`);
                        }}
                      >
                        <span className="tit_unit">Unit</span>
                        <strong className="num">{unit.unit}</strong>
                        <p>{unit.unitName}</p>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectUnit;

