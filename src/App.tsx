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
        <Route path="/" element={<Home />} />
        <Route path="/select-unit" element={<SelectUnit />} />
        <Route path="/select-play" element={<SelectPlay />} />
        <Route path="/phonics-builder" element={<PhonicsBuilder />} />
        <Route path="/shadow-puzzle" element={<ShadowPuzzle />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
