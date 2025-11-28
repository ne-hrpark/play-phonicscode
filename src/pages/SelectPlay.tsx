import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { initCommonScripts } from '../utils/common';
import { loadUnitDataFromExcel, getUnitsByLevel } from '../utils/unitData';

declare global {
  interface Window {
    deviceType: string;
  }
}

const SelectPlay = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookSeq = searchParams.get('book_seq') || '1';
  const unitSeq = searchParams.get('unit_seq') || '1';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUnitName, setCurrentUnitName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 공통 스크립트 초기화
    initCommonScripts();

    // 엑셀에서 유닛 데이터 로드
    loadUnitDataFromExcel('/data/unit_data.xlsx')
      .then((data) => {
        const levelUnits = getUnitsByLevel(data, parseInt(bookSeq, 10));
        const currentUnit = levelUnits.find((unit) => unit.unit === parseInt(unitSeq, 10));
        if (currentUnit) {
          setCurrentUnitName(currentUnit.unitName);
        } else {
          // 기본값
          const defaultUnitNames: { [key: number]: string } = {
            1: 'Aa  Bb  Cc',
            2: 'Dd  Ee  Ff',
            3: 'Gg  Hh  Ii',
            4: 'Jj  Kk  Ll',
            5: 'Mm  Nn  Oo',
            6: 'Pp  Qq  Rr',
            7: 'Ss  Tt  Uu  Vv',
            8: 'Ww  Xx  Yy  Zz',
          };
          setCurrentUnitName(defaultUnitNames[parseInt(unitSeq, 10)] || '');
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('유닛 데이터 로드 실패:', error);
        // 기본값으로 폴백
        const defaultUnitNames: { [key: number]: string } = {
          1: 'Aa  Bb  Cc',
          2: 'Dd  Ee  Ff',
          3: 'Gg  Hh  Ii',
          4: 'Jj  Kk  Ll',
          5: 'Mm  Nn  Oo',
          6: 'Pp  Qq  Rr',
          7: 'Ss  Tt  Uu  Vv',
          8: 'Ww  Xx  Yy  Zz',
        };
        setCurrentUnitName(defaultUnitNames[parseInt(unitSeq, 10)] || '');
        setIsLoading(false);
      });
  }, [bookSeq, unitSeq]);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  const handleBack = () => {
    navigate(`/select-unit?book_seq=${bookSeq}`);
  };


  return (
    <>
      <div className="landscape_warning"></div>
      <div className="wrap" id="container">
        <canvas id="gameCanvas"></canvas>
        <div id="scaleContainer" className="scale_container">
          <div className="dim" style={{ display: isMenuOpen ? 'flex' : 'none' }} onClick={handleMenuClose}></div>
          <header className="intro_header">
            <div className="btns top">
              <a href="#" className="btn_back" onClick={(e) => { e.preventDefault(); handleBack(); }}>
                이전 페이지로 이동
              </a>
              <button type="button" className="btn_menu" onClick={handleMenuToggle}>
                메뉴
              </button>
            </div>
          </header>
          <div className={`side_menu ${isMenuOpen ? 'active' : ''}`}>
            <div className="side_menu_head">
              <img
                src="https://pic.neungyule.com/nebuildandgrow/mobile/phonicscode/ne_bng_logo.svg"
                alt="NE Build & Grow"
              />
              <button type="button" className="btn_close" onClick={handleMenuClose}>
                메뉴닫기
              </button>
            </div>
            <nav>
              <ul>
                <li>
                  <a href={`https://m.nebuildandgrow.co.kr/learning/eng/phonicscode/audiobook.asp?series_seq=7&book_seq=${bookSeq}`} target="_blank">
                    <strong className="tit_menu">Mobile Learning</strong>
                    <span className="desc">Audio / Video</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="sel_play">
            <div className="pb">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/phonics-builder?book_seq=${bookSeq}&unit_seq=${unitSeq}&quiz_seq=1`);
                }}
              >
                <span className="eyes eyes1"></span>
                <span className="eyes eyes2"></span>
                <div className="txt_abs">
                  <strong className="tit">Phonics Builder</strong>
                  <span className="desc">
                    Match the Sounds<br />and Letters
                  </span>
                </div>
              </a>
            </div>

                    <div className="txt_box flex_center">
                      <strong className="unit flex_center">Unit {unitSeq}</strong>
                      {isLoading ? (
                        <span className="eumga"></span>
                      ) : (
                        <span className="eumga">{currentUnitName}</span>
                      )}
                    </div>

            <div className="sp">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/shadow-puzzle?book_seq=${bookSeq}&unit_seq=${unitSeq}&quiz_seq=1`);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="239.919" height="148.018" viewBox="0 0 239.919 148.018">
                  <defs>
                    <clipPath id="clip-path">
                      <path
                        d="M3.752,55.062,92.975,74.623s8.111,1.432,9.543-19.562S92.7,1.555,62.166.123,8.66,9.733,2.457,33.114,3.752,55.062,3.752,55.062Z"
                        fill="#fff"
                      />
                    </clipPath>
                  </defs>
                  <g transform="translate(-58.152 -184.983)">
                    <g transform="translate(298.071 256.736) rotate(164)">
                      <path
                        d="M3.752,55.062,92.975,74.623s8.111,1.432,9.543-19.562S92.7,1.555,62.166.123,8.66,9.733,2.457,33.114,3.752,55.062,3.752,55.062Z"
                        fill="#fff"
                      />
                      <g clipPath="url(#clip-path)">
                        <ellipse
                          className="eyes eyes3"
                          cx="34.353"
                          cy="34.353"
                          rx="34.353"
                          ry="34.353"
                          transform="translate(41.445 19.753)"
                          fill="#43413f"
                        />
                      </g>
                    </g>
                    <g transform="matrix(-0.999, 0.035, -0.035, -0.999, 163.333, 270.514)">
                      <path
                        d="M3.752,55.062,92.975,74.623s8.111,1.432,9.543-19.562S92.7,1.555,62.166.123,8.66,9.733,2.457,33.114,3.752,55.062,3.752,55.062Z"
                        fill="#fff"
                      />
                      <g clipPath="url(#clip-path)">
                        <ellipse
                          className="eyes eyes4"
                          cx="34.353"
                          cy="34.353"
                          rx="34.353"
                          ry="34.353"
                          transform="translate(41.445 19.753)"
                          fill="#43413f"
                        />
                      </g>
                    </g>
                    <path
                      d="M.13,10.952C.659,7.466,2.526-1.054,8.907.108s8.533,9.682,17.31,8.52S42.5.185,49.42,4.058,56.052,26.676,45.234,33.8s-18.585,7.591-23.7,6.816S8.419,34.964,4.518,28.381-.4,14.438.13,10.952Z"
                      transform="translate(153.354 286.68) rotate(6)"
                      fill="#43413f"
                    />
                  </g>
                </svg>
                <div className="txt_abs">
                  <strong className="tit">Shadow Matching</strong>
                  <span className="desc">Find the Match</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectPlay;

