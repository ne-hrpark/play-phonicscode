import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SelectUnit from './pages/SelectUnit';
import SelectPlay from './pages/SelectPlay';
import PhonicsBuilder from './pages/PhonicsBuilder';
import ShadowPuzzle from './pages/ShadowPuzzle';

function App() {
  return (
    // Vite의 base 설정(/ 또는 /play-phonicscode/)에 맞춰 라우터 기준 경로를 자동으로 맞춘다.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* 홈 */}
        <Route path="/" element={<Home />} />

        {/* Unit 선택 - 쿼리(book_seq)와 파라미터(:bookSeq) 둘 다 지원 */}
        <Route path="/select-unit" element={<SelectUnit />} />
        <Route path="/select-unit/:bookSeq" element={<SelectUnit />} />

        {/* 플레이 모드 선택 - 쿼리(book_seq, unit_seq)와 파라미터(:bookSeq/:unitSeq) 둘 다 지원 */}
        <Route path="/select-play" element={<SelectPlay />} />
        <Route path="/select-play/:bookSeq/:unitSeq" element={<SelectPlay />} />

        {/* Phonics Builder - 쿼리(book_seq, unit_seq, quiz_seq)와 파라미터(:level/:unit/:problemNumber) 둘 다 지원 */}
        <Route path="/phonics-builder" element={<PhonicsBuilder />} />
        <Route path="/phonics-builder/:level/:unit/:problemNumber" element={<PhonicsBuilder />} />

        {/* Shadow Puzzle - 쿼리(book_seq, unit_seq, quiz_seq)와 파라미터(:level/:unit/:problemNumber) 둘 다 지원 */}
        <Route path="/shadow-puzzle" element={<ShadowPuzzle />} />
        <Route path="/shadow-puzzle/:level/:unit/:problemNumber" element={<ShadowPuzzle />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
