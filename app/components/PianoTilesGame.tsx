'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PianoTilesGameProps {
  onGameOver?: (score: number) => void;
}

interface Tile {
  id: number;
  x: number;
  y: number;
  column: number;
  alive: boolean;
  clicked: boolean;
  note: string;
}

const CANVAS_WIDTH = 288;
const CANVAS_HEIGHT = 512;
const TILE_WIDTH = CANVAS_WIDTH / 4;
const TILE_HEIGHT = 130;
const INITIAL_SPEED = 3;
const SPEED_INCREMENT = 0.5;
const MAX_SPEED = 12;

const NOTES = [
  'd-7', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7',
  'f1', 'f-1', 'f2', 'f-2', 'f3', 'f-3', 'f4', 'f-4',
  'f5', 'f-5', 'f6', 'f-6', 'f7', 'f-7',
  'g1', 'g-1', 'g2', 'g-2', 'g3', 'g-3', 'g4', 'g-4',
  'g5', 'g-5', 'g6', 'g-6', 'g7', 'g-7'
];

const PianoTilesGame: React.FC<PianoTilesGameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [nextTileId, setNextTileId] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const animationRef = useRef<number>();
  const lastSpawnTime = useRef<number>(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      bgMusicRef.current = new Audio('/piano/sounds/piano-bgmusic.mp3');
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.3;
    }
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameStarted && soundEnabled && bgMusicRef.current) {
      bgMusicRef.current.play().catch(() => {});
    } else if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  }, [gameStarted, soundEnabled]);

  const playSound = (note: string) => {
    if (!soundEnabled) return;
    const audio = new Audio(`/piano/sounds/${note}.ogg`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const playBuzzer = () => {
    if (!soundEnabled) return;
    const audio = new Audio('/piano/sounds/piano-buzzer.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  };

  const getRandomNote = () => {
    return NOTES[Math.floor(Math.random() * NOTES.length)];
  };

  const spawnInitialTiles = useCallback(() => {
    const initialTiles: Tile[] = [];
    for (let i = 0; i < 4; i++) {
      const column = Math.floor(Math.random() * 4);
      initialTiles.push({
        id: i,
        x: column * TILE_WIDTH,
        y: i * TILE_HEIGHT - TILE_HEIGHT * 3,
        column,
        alive: true,
        clicked: false,
        note: getRandomNote(),
      });
    }
    setTiles(initialTiles);
    setNextTileId(4);
  }, []);

  const spawnTile = useCallback(() => {
    const column = Math.floor(Math.random() * 4);
    const newTile: Tile = {
      id: nextTileId,
      x: column * TILE_WIDTH,
      y: -TILE_HEIGHT,
      column,
      alive: true,
      clicked: false,
      note: getRandomNote(),
    };
    setTiles((prev) => [...prev, newTile]);
    setNextTileId((prev) => prev + 1);
  }, [nextTileId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickedTile = tiles.find(
      (tile) =>
        tile.alive &&
        !tile.clicked &&
        clickX >= tile.x &&
        clickX <= tile.x + TILE_WIDTH &&
        clickY >= tile.y &&
        clickY <= tile.y + TILE_HEIGHT
    );

    if (clickedTile) {
      playSound(clickedTile.note);
      
      setTiles((prev) =>
        prev.map((t) =>
          t.id === clickedTile.id ? { ...t, clicked: true, alive: false } : t
        )
      );
      setScore((prev) => prev + 1);

      if ((score + 1) % 10 === 0 && speed < MAX_SPEED) {
        setSpeed((prev) => Math.min(prev + SPEED_INCREMENT, MAX_SPEED));
      }
    }
  };

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_WIDTH, 0);
        ctx.lineTo(i * TILE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();
      }

      const updatedTiles = tiles.map((tile) => {
        if (!tile.alive) return tile;

        const newY = tile.y + speed;

        if (newY > CANVAS_HEIGHT && !tile.clicked) {
          playBuzzer();
          setGameOver(true);
          onGameOver?.(score);
          return { ...tile, alive: false };
        }

        if (tile.alive && !tile.clicked) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(tile.x, newY, TILE_WIDTH, TILE_HEIGHT);

          ctx.strokeStyle = '#bf40bf';
          ctx.lineWidth = 4;
          ctx.strokeRect(tile.x, newY, TILE_WIDTH, TILE_HEIGHT);
        }

        return { ...tile, y: newY };
      });

      setTiles(updatedTiles.filter((t) => t.y < CANVAS_HEIGHT + 100));

      if (currentTime - lastSpawnTime.current > 800) {
        spawnTile();
        lastSpawnTime.current = currentTime;
      }

      ctx.fillStyle = '#feca57';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, 40);

      if (!gameOver) {
        animationRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [tiles, gameOver, score, speed, spawnTile, onGameOver, gameStarted]);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setTiles([]);
    setNextTileId(0);
    lastSpawnTime.current = 0;
    setTimeout(() => {
      spawnInitialTiles();
    }, 100);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setTiles([]);
    setNextTileId(0);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        margin: '0 auto',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Sound Toggle - Top Right */}
      {gameStarted && !gameOver && (
        <button
          onClick={toggleSound}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 20,
            background: 'rgba(0,0,0,0.7)',
            border: '2px solid #feca57',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#feca57',
          }}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      )}

      {/* Start Menu */}
      {!gameStarted && !gameOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '30px',
            zIndex: 10,
          }}
        >
          <img 
            src="/piano/title.png" 
            alt="Piano Tiles"
            style={{ width: '200px', marginBottom: '10px' }}
          />
          <p style={{ fontSize: '16px', color: '#aaa', textAlign: 'center', padding: '0 20px' }}>
            Tap the black tiles as fast as you can!
          </p>
          <img 
            src="/piano/start.png" 
            alt="Start"
            onClick={startGame}
            style={{ width: '120px', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        style={{
          display: 'block',
          cursor: gameStarted && !gameOver ? 'pointer' : 'default',
          background: '#1a1a2e',
        }}
      />

      {/* Game Over Screen */}
      {gameOver && (
        <>
          {/* Red Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url(/piano/red-overlay.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.7,
              zIndex: 5,
            }}
          />
          
          {/* Game Over Content */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              zIndex: 10,
            }}
          >
            <h2 style={{ 
              fontSize: '48px', 
              color: 'white', 
              margin: 0,
              fontWeight: 'bold',
              textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
            }}>
              GAME OVER
            </h2>
            
            <p style={{ 
              fontSize: '24px', 
              color: 'white', 
              margin: 0,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            }}>
              Score: {score}
            </p>
            
            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '20px',
              marginTop: '20px',
            }}>
              {/* Close Button */}
              <button
                onClick={resetGame}
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  color: '#000',
                }}
              >
                <X size={32} />
              </button>
              
              {/* Restart Button */}
              <button
                onClick={startGame}
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  color: '#000',
                }}
              >
                <RotateCcw size={32} />
              </button>
              
              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  color: '#000',
                }}
              >
                {soundEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PianoTilesGame;
