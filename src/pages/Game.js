import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';
import { addSlip, removeSlip, hasRegisteredNickname, usurpHost } from '../utils/sessionUtils';
import ErrorPage from './ErrorPage';

export default function Game() {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [newSlip, setNewSlip] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);
  const [timerError, setTimerError] = useState('');
  const [isUsurping, setIsUsurping] = useState(false);

  // Create audio element for the bell sound
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    // Check if we have a valid game code
    if (!gameCode) {
      console.log('No game code provided, redirecting to join page');
      navigate('/');
      return;
    }

    // Check if player has registered nickname
    if (!hasRegisteredNickname(gameCode)) {
      console.log('No registered nickname, redirecting to join page');
      navigate('/');
      return;
    }

    // Set up listener for session data
    const sessionRef = ref(db, `sessions/${gameCode}`);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('Game not found, redirecting to join page');
        navigate('/');
        return;
      }

      const data = snapshot.val();
      setSessionData(data);
      
      // Check if current player is creator
      const playerId = localStorage.getItem(`player_${gameCode}`);
      setIsCreator(data.players?.[playerId]?.isCreator || false);
    });

    return () => unsubscribe();
  }, [gameCode, navigate]);

  const handleAddSlip = async () => {
    if (!newSlip.trim()) return;
    
    setIsLoading(true);
    try {
      await addSlip(gameCode, newSlip.trim());
      setNewSlip('');
    } catch (err) {
      setError('Failed to add slip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSlip = async (index) => {
    setIsLoading(true);
    try {
      await removeSlip(gameCode, index);
    } catch (err) {
      setError('Failed to remove slip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    if (!isCreator) return;
    
    setIsLoading(true);
    try {
      await update(ref(db, `sessions/${gameCode}`), {
        status: 'submitting'
      });
    } catch (err) {
      setError('Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startPlaying = async () => {
    if (!isCreator) return;
    
    setIsLoading(true);
    try {
      // Combine all player slips into one array
      const allSlips = Object.values(sessionData.playerSlips || {}).flat();
      // Shuffle the slips
      const shuffledSlips = allSlips.sort(() => Math.random() - 0.5);
      
      await update(ref(db, `sessions/${gameCode}`), {
        status: 'playing',
        allSlips: shuffledSlips,
        slipHistory: [], // Add history array
        currentSlipIndex: 0, // Add current index
        revealedSlip: false
      });
    } catch (err) {
      setError('Failed to start playing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimerChange = (e) => {
    const value = e.target.value;
    setTimerDuration(value);
    
    if (value === '') {
      setTimerError('');
    } else {
      const num = parseInt(value);
      if (isNaN(num) || num <= 0) {
        setTimerError('Please enter a number greater than 0');
      } else {
        setTimerError('');
      }
    }
  };

  const startCountdown = () => {
    const num = parseInt(timerDuration);
    if (isNaN(num) || num <= 0) {
      setTimerError('Please enter a number greater than 0');
      return;
    }
    setTimerError('');
    setCountdown(num);
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          audio.play();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const goToPreviousSlip = async () => {
    if (!sessionData.slipHistory?.length) return;
    
    setIsLoading(true);
    try {
      const newHistory = [...sessionData.slipHistory];
      const previousSlip = newHistory.pop();
      const newSlips = [previousSlip, ...sessionData.allSlips];
      
      await update(ref(db, `sessions/${gameCode}`), {
        allSlips: newSlips,
        slipHistory: newHistory,
        revealedSlip: true
      });
    } catch (err) {
      console.error('Error going to previous slip:', err);
      setError('Failed to go back. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextSlip = async () => {
    if (!sessionData.allSlips?.length) return;
    
    setIsLoading(true);
    try {
      const currentSlip = sessionData.allSlips[0];
      const newSlips = [...sessionData.allSlips];
      newSlips.shift();
      const newHistory = [...(sessionData.slipHistory || []), currentSlip];
      
      await update(ref(db, `sessions/${gameCode}`), {
        allSlips: newSlips,
        slipHistory: newHistory,
        revealedSlip: false,
        status: newSlips.length === 0 ? 'ended' : 'playing'
      });
    } catch (err) {
      setError('Failed to go to next slip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsurpHost = async () => {
    if (isCreator) return; // Don't allow host to usurp themselves
    
    setIsUsurping(true);
    try {
      await usurpHost(gameCode);
    } catch (err) {
      console.error('Failed to usurp host:', err);
    } finally {
      setIsUsurping(false);
    }
  };

  const handleRevealSlip = async () => {
    await update(ref(db, `sessions/${gameCode}`), {
      revealedSlip: true
    });
  };

  if (error) {
    return <ErrorPage message={error.message} gameCode={error.gameCode} />;
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  const gameStatus = sessionData.status || 'lobby';
  const playerSlips = sessionData.playerSlips?.[localStorage.getItem(`player_${gameCode}`)] || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Game Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <h1 className="text-2xl font-bold text-center mb-2">Who Even Are You?</h1>
          <p className="text-center text-gray-600">Game Code: {gameCode}</p>
          <div className="text-center">
            {Object.entries(sessionData?.players || {})
              .find(([_, player]) => player.isCreator)?.[1]?.nickname && (
              <p className="text-gray-600">
                Current Host: <span className="font-medium text-green-600">
                  {Object.entries(sessionData?.players || {})
                    .find(([_, player]) => player.isCreator)?.[1]?.nickname}
                </span>
              </p>
            )}
            {!isCreator && (
              <button
                onClick={handleUsurpHost}
                disabled={isUsurping}
                className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isUsurping ? 'Becoming Host...' : 'Become Host'}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error.message}
          </div>
        )}

        {/* Lobby Phase */}
        {gameStatus === 'lobby' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Waiting for players...</h2>
            
            <div className="mb-6 space-y-4 text-gray-600">
              <h3 className="font-medium text-gray-800">How to Play:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Each player writes anonymous slips about themselves</li>
                <li>The host will reveal each slip one at a time</li>
                <li>After a slip is revealed, everyone argues about who they think wrote it</li>
                <li>The person who wrote the slip should try to throw others off during discussion</li>
                <li>Once everyone has voted, the writer reveals themselves.</li>
                <li>If the majority guesses incorrectly, the writer wins that round</li>
                <li>Move on to the next slip and repeat!</li>
              </ol>
              <p className="text-sm text-gray-500 mt-2">Share the game code with your friends to join!</p>
            </div>

            {/* Player List */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-2">Players:</h3>
              <div className="space-y-2">
                {Object.entries(sessionData.players || {}).map(([playerId, player]) => (
                  <div key={playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="flex items-center">
                      {player.nickname}
                      {player.isCreator && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Host
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isCreator && (
              <button
                onClick={startGame}
                disabled={isLoading}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Start Game
              </button>
            )}
          </div>
        )}

        {/* Slip Submission Phase */}
        {gameStatus === 'submitting' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Write Something about yourself that no one else knows</h2>
            <div className="space-y-4">
              <div>
                <textarea
                  value={newSlip}
                  onChange={(e) => setNewSlip(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Example: My favorite chocolate flavor is salted caramel"
                  rows={3}
                />
                <button
                  onClick={handleAddSlip}
                  disabled={isLoading || !newSlip.trim()}
                  className="mt-2 w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Add Slip
                </button>
              </div>

              {playerSlips.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Your Slips:</h3>
                  <div className="space-y-2">
                    {playerSlips.map((slip, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{slip}</span>
                        <button
                          onClick={() => handleRemoveSlip(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isCreator && (
                <button
                  onClick={startPlaying}
                  disabled={isLoading}
                  className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Start Reading Slips
                </button>
              )}
            </div>
          </div>
        )}

        {/* Playing Phase */}
        {gameStatus === 'playing' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              {isCreator && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold">Slips Remaining: {sessionData.allSlips?.length}</h2>
                    <div className="flex items-center space-x-2">
                      <label htmlFor="timer" className="text-sm text-gray-600">Timer (seconds):</label>
                      <input
                        type="number"
                        id="timer"
                        value={timerDuration}
                        onChange={handleTimerChange}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={startCountdown}
                    disabled={!!countdown}
                    className="bg-blue-500 text-white py-1 px-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Start Timer
                  </button>
                </div>
              )}
              {isCreator && timerError && (
                <p className="text-sm text-red-500 mt-1">
                  {timerError}
                </p>
              )}
              {countdown && (
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-500">
                    {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {countdown === 1 ? 'Second remaining' : 'Seconds remaining'}
                  </div>
                </div>
              )}

              {sessionData.allSlips?.length > 0 ? (
                <div>
                  <div className="p-4 bg-gray-50 rounded-md mb-4 min-h-[100px] flex items-center justify-center">
                    {sessionData.revealedSlip ? (
                      <button
                        onClick={handleRevealSlip}
                        className="w-full h-full py-8 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors"
                      >
                        Click to Reveal Slip
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await update(ref(db, `sessions/${gameCode}`), {
                            revealedSlip: true
                          });
                        }}
                        className="w-full h-full py-8 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors"
                      >
                        Click to Reveal Slip
                      </button>
                    )}
                  </div>


                  {isCreator && (
                    <div className="flex space-x-4 mt-4">
                      <button
                        onClick={goToPreviousSlip}
                        disabled={isLoading || !sessionData.slipHistory?.length}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors border border-gray-200"
                      >
                        Previous Slip
                      </button>
                      <button
                        onClick={goToNextSlip}
                        disabled={isLoading || !sessionData.revealedSlip}
                        className="flex-1 bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                      >
                        Next Slip
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-xl">
                  The bowl is empty! 🎉
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game End Phase */}
        {gameStatus === 'ended' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over! 🎉</h2>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
