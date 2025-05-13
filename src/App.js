// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Host from './pages/Host';
import Join from './pages/Join';
import Game from './pages/Game';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/join" element={<Join />} />
        <Route path="/game/:gameCode" element={<Game />} />
      </Routes>
    </Router>
  );
}
