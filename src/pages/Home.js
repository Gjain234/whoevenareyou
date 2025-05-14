import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGameSession, joinGameSession } from '../utils/sessionUtils';

export default function Home() {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNicknameInput, setShowNicknameInput] = useState(false);
  const [actionType, setActionType] = useState(''); // 'create' or 'join'

  // Clear error state when component unmounts
  useEffect(() => {
    return () => {
      setError('');
    };
  }, []);

  const handleCreateGame = async () => {
    setActionType('create');
    setShowNicknameInput(true);
    setError('');
  };

  const handleJoinGame = async () => {
    const code = gameCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a game code');
      return;
    }
    setActionType('join');
    setShowNicknameInput(true);
  };

  const handleSubmitNickname = async () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setError('Please enter a nickname');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (actionType === 'create') {
        const code = await createGameSession(trimmedNickname);
        console.log('Game created with code:', code);
        if (!code) {
          throw new Error('No game code returned');
        }
        navigate(`/game/${code}`);
      } else {
        const code = gameCode.trim().toUpperCase();
        console.log('Attempting to join game:', code);
        await joinGameSession(code, trimmedNickname);
        console.log('Successfully joined game:', code);
        navigate(`/game/${code}`);
      }
    } catch (err) {
      console.error('Error in handleSubmitNickname:', err);
      setError(err.message || (actionType === 'create' 
        ? 'Failed to create game. Please try again.'
        : 'Failed to join game. Please check the code and try again.'));
      setShowNicknameInput(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowNicknameInput(false);
    setNickname('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Who Even Are You?</h1>
          <p className="text-gray-600">A game of hidden truths and wild guesses</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {!showNicknameInput ? (
            <>
              {/* Create Game */}
              <div>
                <button
                  onClick={handleCreateGame}
                  disabled={isLoading}
                  className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Create New Game
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Join Game */}
              <div>
                <label htmlFor="gameCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Game Code
                </label>
                <input
                  type="text"
                  id="gameCode"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="Enter game code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
                />
                <button
                  onClick={handleJoinGame}
                  disabled={isLoading}
                  className="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Join Game
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Nickname Input */}
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Nickname
                </label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your nickname"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
                />
                <div className="flex space-x-4">
                  <button
                    onClick={handleBack}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitNickname}
                    disabled={isLoading}
                    className="flex-1 bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {actionType === 'create' ? 'Create Game' : 'Join Game'}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
