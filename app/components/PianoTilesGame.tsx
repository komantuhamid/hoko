'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
}

const CANVAS_WIDTH = 288;
const CANVAS_HEIGHT = 512;
const TILE_WIDTH = CANVAS_WIDTH / 4;
const TILE_HEIGHT = 130;
const INITIAL_SPEED = 3;
const SPEED_INCREMENT = 0.5;
const MAX_SPEED = 12;

const PianoTilesGame: React.FC<PianoTilesGameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [nextTileId, setNextTileId] = useState(0);
  const animationRef = useRef<number>();
  const lastSpawnTime = useRef<number>(0);

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
          <h1 style={{ fontSize: '40px', color: '#feca57', margin: 0 }}>
            PIANO TILES
          </h1>
          <p style={{ fontSize: '16px', color: '#aaa', textAlign: 'center', padding: '0 20px' }}>
            Tap the black tiles as fast as you can!
          </p>
          <button
            onClick={startGame}
            style={{
              padding: '15px 50px',
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            START
          </button>
        </div>
      )}

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

      {gameOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 10,
          }}
        >
          <h2 style={{ fontSize: '36px', color: '#feca57', margin: 0 }}>
            GAME OVER
          </h2>
          <p style={{ fontSize: '28px', color: 'white', margin: 0 }}>
            Score: {score}
          </p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={startGame}
              style={{
                padding: '15px 40px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              TRY AGAIN
            </button>
            <button
              onClick={resetGame}
              style={{
                padding: '15px 40px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'white',
                background: 'transparent',
                border: '2px solid #666',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PianoTilesGame;
