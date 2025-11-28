import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initCommonScripts, initWithJQuery } from '../utils/common';
import '../App.css';

declare global {
  interface Window {
    Swiper: any;
    $: any;
    jQuery: any;
    deviceType: string;
  }
}

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 공통 스크립트 초기화
    initCommonScripts();
    
    // jQuery 초기화 (jQuery가 로드된 후)
    if (window.$ || window.jQuery) {
      initWithJQuery();
    } else {
      // jQuery가 아직 로드되지 않았다면 대기
      const checkJQuery = setInterval(() => {
        if (window.$ || window.jQuery) {
          initWithJQuery();
          clearInterval(checkJQuery);
        }
      }, 100);
      
      // 5초 후 타임아웃
      setTimeout(() => clearInterval(checkJQuery), 5000);
    }
    
    // Swiper 초기화
    if (window.Swiper) {
      new window.Swiper('.swiper', {
        spaceBetween: 20,
        slidesPerView: 'auto',
        slidesOffsetAfter: 0,
        centeredSlides: false,
        freeMode: true,
        on: {
          init: function (this: any) {
            const slides = Array.from(this.slides) as HTMLElement[];
            slides.forEach((slide: HTMLElement, i: number) => {
              slide.style.animationDelay = `${i * 60}ms`;
              slide.classList.add('animate-in-left');
            });
            const LAST = (slides.length - 1) * 60 + 700; // 마지막 슬라이드 애니메이션 완료 시점
            setTimeout(() => {
              slides.forEach((slide: HTMLElement) => {
                slide.classList.remove('animate-in-left');
                slide.style.removeProperty('animation-delay');
                slide.style.opacity = '1';
              });
            }, LAST + 100);
          },
        },
      });
    }
  }, []);

  const handleBookClick = (bookSeq: number) => {
    navigate(`/select-unit?book_seq=${bookSeq}`);
  };

  return (
    <>
      <div className="landscape_warning"></div>
      <div className="wrap sel_book" id="container">
        <canvas id="gameCanvas"></canvas>
        <div className="scale_container">
          <Header />
          <div className="swiper_wrap animate">
            <div className="swiper">
              <div className="swiper-wrapper">
                <div className="swiper-slide">
                  <a href="#" onClick={(e) => { e.preventDefault(); handleBookClick(1); }}>
                    <img
                      src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/cover1.jpg"
                      alt="Phonics Code 1"
                    />
                  </a>
                </div>
                <div className="swiper-slide">
                  <a href="#" onClick={(e) => { e.preventDefault(); handleBookClick(2); }}>
                    <img
                      src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/cover2.jpg"
                      alt="Phonics Code 2"
                    />
                  </a>
                </div>
                <div className="swiper-slide">
                  <a href="#" onClick={(e) => { e.preventDefault(); handleBookClick(3); }}>
                    <img
                      src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/cover3.jpg"
                      alt="Phonics Code 3"
                    />
                  </a>
                </div>
                <div className="swiper-slide">
                  <a href="#" onClick={(e) => { e.preventDefault(); handleBookClick(4); }}>
                    <img
                      src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/cover4.jpg"
                      alt="Phonics Code 4"
                    />
                  </a>
                </div>
                <div className="swiper-slide">
                  <a href="#" onClick={(e) => { e.preventDefault(); handleBookClick(5); }}>
                    <img
                      src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/cover5.jpg"
                      alt="Phonics Code 5"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;

