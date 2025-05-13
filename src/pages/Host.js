import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Host() {
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const navigate = useNavigate();

  useEffect(() => {
    async function createSession() {
      await setDoc(doc(db, 'sessions', sessionId), {
        createdAt: Date.now(),
        slips: [],
        started: false,
        host: true,
      });
      navigate(`/game/${sessionId}`);
    }
    createSession();
  }, [sessionId, navigate]);

  return <div className="p-4">Creating game...</div>;
}
