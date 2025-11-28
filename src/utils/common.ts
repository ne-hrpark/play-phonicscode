// jQuery 타입 선언
declare global {
  interface Window {
    $: any;
    jQuery: any;
    deviceType: string;
  }
}

// Viewport Height 설정
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// 가로/세로 방향 체크
export function isLandscape(): boolean {
  return window.innerWidth >= window.innerHeight;
}

// PC 체크
export function isPC(): boolean {
  // 최신 Chromium 기반 브라우저에서 userAgentData 사용
  if ((navigator as any).userAgentData) {
    return (navigator as any).userAgentData.mobile === false;
  }

  const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera;
  
  // 모바일 OS 체크
  const isMobileUA = /android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // iPadOS 13 이상은 Mac으로 인식되는 경우가 있어서 추가 처리
  const isIPadOS = /Macintosh/.test(ua) && 'ontouchend' in document;
  
  // 모바일이면 false, PC면 true
  return !(isMobileUA || isIPadOS);
}

// Canvas 리사이즈
function resizeCanvas() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const container = document.getElementById('container') as HTMLElement;
  
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 세로 기준(높이 기준)으로 16:9 계산
  let height = viewportHeight;
  let width = height * 16 / 9;

  // 가로가 넘치면 가로 기준으로 계산
  if (width > viewportWidth) {
    width = viewportWidth;
    height = width * 9 / 16;
  }

  // container 스타일 적용
  container.style.width = width + 'px';
  container.style.height = height + 'px';

  // 캔버스 CSS 스타일 + 실제 크기
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.width = width;
  canvas.height = height;

  draw(ctx, width, height);
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
}

// WordBox 리사이즈
function resizeWordBox() {
  const wordBoxWrap = document.querySelector('.scale_container') as HTMLElement;
  const container = document.querySelector('#container') as HTMLElement;
  
  if (!wordBoxWrap || !container) return;

  const ORIGINAL_W = 1280;
  const ORIGINAL_H = 720;

  const cw = container.clientWidth + 2; // dim 때문에 +2
  const ch = container.clientHeight + 2;

  // container 크기에 맞춘 스케일
  const scale = Math.min(cw / ORIGINAL_W, ch / ORIGINAL_H);

  // 중앙 정렬 + 스케일
  wordBoxWrap.style.transformOrigin = 'center center';
  wordBoxWrap.style.transform = `translate(-50%, -50%) scale(${scale})`;

  // 원본 크기 유지
  wordBoxWrap.style.width = ORIGINAL_W + 'px';
  wordBoxWrap.style.height = ORIGINAL_H + 'px';

  const deviceType = window.deviceType || 'PC';

  if (deviceType === 'MO') {
    // 모바일인 경우 실행되는 코드
    container.style.top = '0';
    container.style.transform = 'translate(-50%, 0)';
  } else if (deviceType === 'TB') {
    // 태블릿
  } else {
    container.style.top = '50%';
    container.style.transform = 'translate(-50%, -50%)';
  }
}

// 리사이즈 전체 함수
function resizeAll() {
  const spinner = document.getElementById('spinner') as HTMLElement;
  
  if (spinner) {
    spinner.style.display = 'block';
  }

  resizeCanvas();
  resizeWordBox();

  if (spinner) {
    spinner.style.display = 'none';
  }
}

// mp3 재생 함수
export function playAudio(src: string | null, onEnded?: () => void) {
  const player = document.getElementById('player') as HTMLAudioElement;
  
  if (!player) {
    console.error('player 요소를 찾을 수 없습니다.');
    return;
  }

  // 기존 재생 중지
  player.pause();
  player.currentTime = 0;

  // src 없으면 제거
  if (!src) {
    player.removeAttribute('src');
    player.load();
    return;
  }

  // 새 src 설정
  player.src = src;
  player.load();

  // ended 이벤트 등록
  if (typeof onEnded === 'function') {
    (player as any)._onEndedHandler = onEnded;
    player.addEventListener('ended', (player as any)._onEndedHandler, { once: true });
  }

  // 재생 시작
  player.play().catch(() => {
    if (onEnded) onEnded();
  });
}

// 초기화 함수
export function initCommonScripts() {
  // Viewport Height 설정
  setViewportHeight();
  window.addEventListener('resize', () => {
    setViewportHeight();
  });

  // INTRO HEADER 메뉴는 React Header 컴포넌트에서 관리하므로 여기서는 제거
  // React state로 관리되므로 DOM 직접 조작 불필요

  // 초기/리사이즈 시 실행
  resizeAll();

  window.addEventListener('resize', () => {
    requestAnimationFrame(resizeAll);
  });

  if ((window as any).visualViewport) {
    (window as any).visualViewport.addEventListener('resize', () => {
      requestAnimationFrame(resizeAll);
    });
  }
}

// jQuery가 로드된 후 실행
export function initWithJQuery() {
  if (window.$ || window.jQuery) {
    const $ = window.$ || window.jQuery;
    
    $(function () {
      setViewportHeight();
      
      $(window).on('resize', function () {
        setViewportHeight();
      });
    });
  }
}

