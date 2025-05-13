import { db } from '../firebase';
import { ref, set, get, update, onValue, onDisconnect } from 'firebase/database';
import { GAME_WORDS } from './gameWords';

// Function to generate a random game code from fun words
const generateGameCode = () => {
  const randomIndex = Math.floor(Math.random() * GAME_WORDS.length);
  return GAME_WORDS[randomIndex];
};

// Generate a unique creator ID
const generateCreatorId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Generate a unique player ID that's safe for Firebase keys
const generatePlayerId = () => {
  // Use only alphanumeric characters and underscores
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// Create a new game session
export const createGameSession = async (nickname) => {
  let gameCode;
  try {
    const creatorId = generateCreatorId();
    gameCode = generateGameCode();
    
    console.log('Creating game with code:', gameCode);
    
    // Store creator ID and nickname in localStorage
    localStorage.setItem('creatorId', creatorId);
    localStorage.setItem(`nickname_${gameCode}`, nickname);
    localStorage.setItem(`player_${gameCode}`, creatorId); // Store creator as a player too
    
    const sessionData = {
      gameCode,
      creatorId,
      status: 'lobby',
      playerCount: 1,
      players: {
        [creatorId]: {
          nickname,
          isCreator: true
        }
      },
      playerSlips: {
        [creatorId]: [] // Initialize empty slips array for creator
      },
      allSlips: [],
      slipHistory: [],
      currentSlipIndex: 0,
      revealedSlip: false
    };

    await set(ref(db, `sessions/${gameCode}`), sessionData);

    // Set up disconnect handler for host
    const hostRef = ref(db, `sessions/${gameCode}/players/${creatorId}`);
    onDisconnect(hostRef).remove();

    // Set up a listener for player changes to handle host reassignment
    setupHostReassignmentListener(gameCode);

    console.log('Game session created successfully');
    return gameCode;
  } catch (error) {
    console.error('Error creating game session:', error);
    // Clean up localStorage if session creation fails
    if (gameCode) {
      localStorage.removeItem('creatorId');
      localStorage.removeItem(`nickname_${gameCode}`);
      localStorage.removeItem(`player_${gameCode}`);
    }
    throw error;
  }
};

// Join an existing game session
export const joinGameSession = async (gameCode, nickname) => {
  try {
    console.log('Attempting to join game:', gameCode);
    
    // Validate inputs
    if (!gameCode || !nickname) {
      throw new Error('Game code and nickname are required');
    }

    // Check if game exists
    const sessionRef = ref(db, `sessions/${gameCode}`);
    const sessionSnapshot = await get(sessionRef);

    if (!sessionSnapshot.exists()) {
      console.error('Game not found:', gameCode);
      throw new Error('Game not found');
    }

    const sessionData = sessionSnapshot.val();
    console.log('Found game session:', sessionData);

    // Generate player ID and store in localStorage
    const playerId = generatePlayerId();
    console.log('Generated player ID:', playerId);
    
    localStorage.setItem(`player_${gameCode}`, playerId);
    localStorage.setItem(`nickname_${gameCode}`, nickname);

    // Update session with new player
    const updates = {
      [`players/${playerId}`]: {
        nickname,
        isCreator: false
      },
      [`playerSlips/${playerId}`]: [], // Initialize empty slips array for new player
      playerCount: (sessionData.playerCount || 0) + 1
    };

    // If there's no current host, make this player the host
    const hasHost = Object.values(sessionData.players || {}).some(player => player.isCreator);
    if (!hasHost) {
      updates[`players/${playerId}/isCreator`] = true;
    }

    console.log('Updating game session with:', updates);
    await update(sessionRef, updates);

    // Set up disconnect handler for this player
    const playerRef = ref(db, `sessions/${gameCode}/players/${playerId}`);
    onDisconnect(playerRef).remove();

    // Set up a listener for player changes to handle host reassignment
    setupHostReassignmentListener(gameCode);

    console.log('Successfully joined game');
    return gameCode;
  } catch (error) {
    console.error('Error joining game session:', error);
    // Clean up localStorage if join fails
    if (gameCode) {
      localStorage.removeItem(`player_${gameCode}`);
      localStorage.removeItem(`nickname_${gameCode}`);
    }
    throw error;
  }
};

// Helper function to set up host reassignment listener
const setupHostReassignmentListener = (gameCode) => {
  const playersRef = ref(db, `sessions/${gameCode}/players`);
  onValue(playersRef, (snapshot) => {
    if (snapshot.exists()) {
      const players = snapshot.val();
      const hasHost = Object.values(players).some(player => player.isCreator);
      
      if (!hasHost && Object.keys(players).length > 0) {
        console.log('No host found, assigning new host');
        // Get all players and sort them by their join order (based on their ID)
        const playerIds = Object.keys(players).sort();
        // Pick the player who has been in the game the longest
        const newHostId = playerIds[0];
        console.log('Assigning new host:', players[newHostId].nickname);
        update(playersRef, {
          [`${newHostId}/isCreator`]: true
        });
      }
    }
  });
};

// Check if a player has a registered nickname for a game
export const hasRegisteredNickname = (gameCode) => {
  return !!localStorage.getItem(`nickname_${gameCode}`);
};

// Get the registered nickname for a game
export const getRegisteredNickname = (gameCode) => {
  return localStorage.getItem(`nickname_${gameCode}`);
};

// Add a slip to the game
export const addSlip = async (gameCode, slip) => {
  try {
    const sessionRef = ref(db, `sessions/${gameCode}`);
    const sessionSnapshot = await get(sessionRef);
    const playerId = localStorage.getItem(`player_${gameCode}`);
    
    if (!sessionSnapshot.exists() || !playerId) {
      throw new Error('Game not found');
    }

    const sessionData = sessionSnapshot.val();
    const playerSlips = sessionData.playerSlips?.[playerId] || [];
    
    await update(sessionRef, {
      [`playerSlips/${playerId}`]: [...playerSlips, slip]
    });
  } catch (error) {
    console.error('Error adding slip:', error);
    throw error;
  }
};

// Remove a slip from the game
export const removeSlip = async (gameCode, slipIndex) => {
  const sessionRef = ref(db, `sessions/${gameCode}`);
  const sessionSnapshot = await get(sessionRef);
  const playerId = localStorage.getItem(`player_${gameCode}`);
  
  if (!sessionSnapshot.exists() || !playerId) {
    throw new Error('Game not found');
  }

  const sessionData = sessionSnapshot.val();
  const playerSlips = [...(sessionData.playerSlips?.[playerId] || [])];
  playerSlips.splice(slipIndex, 1);
  
  await update(sessionRef, {
    [`playerSlips.${playerId}`]: playerSlips
  });
};

// Get current player's slips
export const getPlayerSlips = (sessionData) => {
  const playerId = localStorage.getItem(`player_${sessionData.id}`);
  return sessionData.playerSlips?.[playerId] || [];
}; 