import { useEffect } from 'react';
import { useStore } from './store/worldStore';
import { GameTable } from './ui/screens/GameTable';

export function App() {
  const world = useStore((s) => s.world);
  const newGame = useStore((s) => s.newGame);

  useEffect(() => {
    if (!world) {
      const seedParam = new URLSearchParams(location.search).get('seed');
      newGame(seedParam ? Number(seedParam) : undefined);
    }
  }, [world, newGame]);

  return <GameTable />;
}
