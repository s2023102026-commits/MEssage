import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreatorPage from './pages/CreatorPage';
import LetterPage from './pages/LetterPage';
import './index.css';

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<CreatorPage />} />
        <Route path="/letter" element={<LetterPage />} />
        <Route path="*" element={<CreatorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
