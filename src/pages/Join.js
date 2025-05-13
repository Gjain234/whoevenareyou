import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Join() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl mb-4">Enter Game Code</h2>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className="border px-3 py-2 rounded mb-4"
        placeholder="e.g. F7X2PR"
      />
      <button
        className="px-4 py-2 bg-blue-300 rounded-lg"
        onClick={() => navigate(`/game/${code}`)}
      >
        Join
      </button>
    </div>
  );
}
