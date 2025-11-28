import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SelectUnit from './pages/SelectUnit';
import SelectPlay from './pages/SelectPlay';
import PhonicsBuilder from './pages/PhonicsBuilder';
import ShadowPuzzle from './pages/ShadowPuzzle';

function App() {
  return (
    <BrowserRouter>
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
