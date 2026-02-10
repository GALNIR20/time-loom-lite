import { createContext, useContext, ReactNode, useState, useCallback } from 'react';

export type GameType = 'SGH' | 'HOF';

const STORAGE_KEY = 'predictor-selected-game';

interface GameContextType {
  selectedGame: GameType | null;
  setSelectedGame: (game: GameType) => void;
  clearGame: () => void;
}

const GameContext = createContext<GameContextType>({
  selectedGame: null,
  setSelectedGame: () => {},
  clearGame: () => {},
});

function getStoredGame(): GameType | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'SGH' || stored === 'HOF') return stored;
  } catch {}
  return null;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [selectedGame, setSelectedGameState] = useState<GameType | null>(getStoredGame);

  const setSelectedGame = useCallback((game: GameType) => {
    localStorage.setItem(STORAGE_KEY, game);
    setSelectedGameState(game);
  }, []);

  const clearGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedGameState(null);
  }, []);

  return (
    <GameContext.Provider value={{ selectedGame, setSelectedGame, clearGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
