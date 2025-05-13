// Who Even Are You? - Complete Free Version (React + Firebase)

// 1. Install required packages:
//    npm install react-router-dom firebase tailwindcss uuid
//    (Follow Tailwind setup: https://tailwindcss.com/docs/guides/create-react-app)

// 2. Set up Firebase project:
//    - Enable Authentication (anonymous)
//    - Enable Realtime Database
//    - Replace Firebase config below with your own

// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAF-egNWQXt9CSXhq6U_eg3NwSV3mZOAo8",
    authDomain: "whoevenareyou-86aee.firebaseapp.com",
    projectId: "whoevenareyou-86aee",
    storageBucket: "whoevenareyou-86aee.firebasestorage.app",
    messagingSenderId: "485234089978",
    appId: "1:485234089978:web:14d746392978d301644e43",
    measurementId: "G-YKT383HQ4B",
    databaseURL: "https://whoevenareyou-86aee-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
signInAnonymously(auth);

export { db };
