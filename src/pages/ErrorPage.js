import React from 'react';
import { Link } from 'react-router-dom';

export default function ErrorPage({ message, gameCode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              {gameCode ? (
                <>
                  You need to join game <span className="font-bold">{gameCode}</span> first!
                </>
              ) : (
                'You need to join a game first!'
              )}
            </p>
            <Link
              to="/"
              className="inline-block bg-pink-500 text-white py-2 px-6 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 