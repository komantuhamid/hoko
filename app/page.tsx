'use client';

import PianoTilesGame from './components/PianoTilesGame';

export default function Page() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <PianoTilesGame onGameOver={(score) => console.log('Final Score:', score)} />
    </div>
  );
}
