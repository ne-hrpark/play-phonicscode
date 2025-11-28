import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  bookSeq?: string;
  showBackButton?: boolean;
}

const Header = ({ bookSeq, showBackButton = false }: HeaderProps) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  const handleBack = () => {
    navigate('/');
  };

  const getTitle = () => {
    if (bookSeq) {
      return `Phonics Code ${bookSeq}`;
    }
    return 'Phonics Code';
  };

  const getMenuLink = () => {
    if (bookSeq) {
      return `https://m.nebuildandgrow.co.kr/learning/eng/phonicscode/audiobook.asp?series_seq=7&book_seq=${bookSeq}`;
    }
    return '/learning/eng/phonicscode/index.asp';
  };

  return (
    <>
      <div className="dim" style={{ display: isMenuOpen ? 'flex' : 'none' }} onClick={handleMenuClose}></div>
      <header className={`intro_header ${showBackButton ? 'white' : ''}`}>
        <h1>
          <a href="javascript://">
            <span className="hidden">PLAY</span>
            {getTitle()}
          </a>
        </h1>
        <div className="btns">
          {showBackButton && (
            <a href="#" className="btn_back" onClick={(e) => { e.preventDefault(); handleBack(); }}>
              이전 페이지로 이동
            </a>
          )}
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
              <a href={getMenuLink()} target="_blank">
                <strong className="tit_menu">Mobile Learning</strong>
                <span className="desc">Audio / Video</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Header;

