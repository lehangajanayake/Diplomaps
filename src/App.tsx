import { useEffect } from 'react';
import { beginGame, checkHealth } from './store/flow';
import { useStore } from './store/worldStore';
import { EndScreen } from './ui/screens/EndScreen';
import { GameTable } from './ui/screens/GameTable';
import { TitleScreen } from './ui/screens/TitleScreen';

export function App() {
  const phase = useStore((s) => s.phase);

  useEffect(() => {
    void checkHealth();
    const params = new URLSearchParams(location.search);
    if (params.has('seed') && params.has('skipTitle')) beginGame();
  }, []);

  if (phase === 'title') return <TitleScreen />;
  if (phase === 'ending') return <EndScreen />;
  return <GameTable />;
}
