import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreatorPage from './pages/CreatorPage';
import LetterPage from './pages/LetterPage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreatorPage />} />
        <Route path="/letter" element={<LetterPage />} />
      </Routes>
    </Router>
  );
}

export default App;
