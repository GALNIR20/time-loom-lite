import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useGame, GameType } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { pb } from '@/lib/pocketbase';
import { PredictorLogo } from '@/components/PredictorLogo';
import { Gamepad2, LogOut, Spade, Loader2 } from 'lucide-react';

const GAMES: { id: GameType; name: string; description: string; color: string; bgGradient: string; icon: 'spade' | 'gamepad' }[] = [
  {
    id: 'SGH',
    name: 'SGH',
    description: 'Solitaire Grand Harvest',
    color: 'from-green-500 to-emerald-600',
    bgGradient: 'hover:border-green-400/50 hover:shadow-green-500/20',
    icon: 'spade',
  },
  {
    id: 'HOF',
    name: 'HOF',
    description: 'House of Fun',
    color: 'from-amber-500 to-orange-600',
    bgGradient: 'hover:border-amber-400/50 hover:shadow-amber-500/20',
    icon: 'gamepad',
  },
];

export default function GameSelectPage() {
  const navigate = useNavigate();
  const { setSelectedGame } = useGame();
  const { user, signOut } = useAuth();
  const [allowedGames, setAllowedGames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's allowed games from PocketBase
  useEffect(() => {
    async function fetchAllowedGames() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const record = await pb.collection('users').getOne(user.id, { requestKey: 'fetch-allowed-games' });
        const games = (record.allowed_games as string[]) || [];
        const userIsAdmin = record.role === 'admin';
        setAllowedGames(games);

        // If non-admin user only has access to one game, auto-select it
        if (!userIsAdmin && games.length === 1) {
          setSelectedGame(games[0] as GameType);
          navigate('/');
          return;
        }
      } catch {
        // Default to showing all games if fetch fails
        setAllowedGames(GAMES.map(g => g.id));
      } finally {
        setLoading(false);
      }
    }
    fetchAllowedGames();
  }, [user, setSelectedGame, navigate]);

  const isAdmin = user?.role === 'admin';
  const visibleGames = isAdmin || allowedGames.length === 0
    ? GAMES
    : GAMES.filter(g => allowedGames.includes(g.id));

  const handleSelectGame = (game: GameType) => {
    setSelectedGame(game);
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <PredictorLogo size="lg" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">PREDICTOR</h1>
        <p className="text-muted-foreground">Select your game to continue</p>
      </div>

      {/* No Games Assigned */}
      {visibleGames.length === 0 ? (
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <Gamepad2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No Games Assigned</h2>
          <p className="text-muted-foreground">
            You don't have access to any games yet. Please contact an administrator to get access.
          </p>
        </div>
      ) : (
        /* Game Cards */
        <div className={`grid grid-cols-1 ${visibleGames.length > 1 ? 'sm:grid-cols-2' : ''} gap-6 max-w-xl w-full`}>
          {visibleGames.map((game) => (
            <button
              key={game.id}
              onClick={() => handleSelectGame(game.id)}
              className={`group relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border/50 bg-card shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${game.bgGradient} cursor-pointer`}
            >
              {/* Icon */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                {game.icon === 'spade' ? (
                  <Spade className="w-10 h-10 text-white" />
                ) : (
                  <Gamepad2 className="w-10 h-10 text-white" />
                )}
              </div>

              {/* Text */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">{game.name}</h2>
                <p className="text-sm text-muted-foreground">{game.description}</p>
              </div>

              {/* Hover ring effect */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-primary/30 transition-all pointer-events-none" />
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="truncate max-w-[200px]">{user?.email}</span>
        <span className="text-border">|</span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
