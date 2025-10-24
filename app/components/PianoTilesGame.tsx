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

interface FloatingText {
  id: number;
  x: number;
  y: number;
  initialY: number;
}

const CANVAS_WIDTH = 288;
const CANVAS_HEIGHT = 512;
const TILE_WIDTH = CANVAS_WIDTH / 4;
const TILE_HEIGHT = 130;
const FPS = 30;

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
  const [highScore, setHighScore] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [nextTileId, setNextTileId] = useState(0);
  const [nextTextId, setNextTextId] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [overlayIndex, setOverlayIndex] = useState(0);
  const animationRef = useRef<number>();
  const frameCount = useRef(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // Calculate speed based on score (matches Python: 200 + 5 * score)
  const getSpeed = (currentScore: number) => {
    return (200 + 5 * currentScore) * (FPS / 1000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      bgMusicRef.current = new Audio('/piano/sounds/piano-bgmusic.mp3');
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.8;
    }
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameStarted && soundEnabled && bgMusicRef.current && countdown <= 0) {
      bgMusicRef.current.play().catch(() => {});
    } else if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  }, [gameStarted, soundEnabled, countdown]);

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

  const spawnTile = useCallback((yPos: number) => {
    const column = Math.floor(Math.random() * 4);
    const newTile: Tile = {
      id: nextTileId,
      x: column * TILE_WIDTH,
      y: yPos,
      column,
      alive: true,
      clicked: false,
      note: getRandomNote(),
    };
    setTiles((prev) => [...prev, newTile]);
    setNextTileId((prev) => prev + 1);
  }, [nextTileId]);

  const addFloatingText = (x: number, y: number) => {
    const newText: FloatingText = {
      id: nextTextId,
      x: x - 10,
      y: y,
      initialY: y,
    };
    setFloatingTexts((prev) => [...prev, newText]);
    setNextTextId((prev) => prev + 1);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStarted || gameOver || countdown > 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let clickedTile = null;

    for (const tile of tiles) {
      if (
        tile.alive &&
        !tile.clicked &&
        clickX >= tile.x &&
        clickX <= tile.x + TILE_WIDTH &&
        clickY >= tile.y &&
        clickY <= tile.y + TILE_HEIGHT
      ) {
        clickedTile = tile;
        break;
      }
    }

    if (clickedTile) {
      playSound(clickedTile.note);
      
      setTiles((prev) =>
        prev.map((t) =>
          t.id === clickedTile.id ? { ...t, clicked: true, alive: false } : t
        )
      );
      
      setScore((prev) => {
        const newScore = prev + 1;
        if (newScore > highScore) {
          setHighScore(newScore);
        }
        return newScore;
      });

      addFloatingText(clickedTile.x + TILE_WIDTH / 2, clickedTile.y);
    } else {
      // Clicked outside tile - game over
      playBuzzer();
      setGameOver(true);
      setOverlayIndex(0);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (gameStarted && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, countdown]);

  useEffect(() => {
    if (!gameStarted || countdown > 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const speed = getSpeed(score);

    const gameLoop = () => {
      frameCount.current += 1;

      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid lines
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_WIDTH, 0);
        ctx.lineTo(i * TILE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();
      }

      if (!gameOver) {
        // Update tiles
        const updatedTiles = tiles.map((tile) => {
          const newY = tile.y + speed;

          // Check if tile reached bottom
          if (newY + TILE_HEIGHT >= CANVAS_HEIGHT && tile.alive) {
            playBuzzer();
            setGameOver(true);
            setOverlayIndex(0);
            return { ...tile, y: newY, alive: false };
          }

          return { ...tile, y: newY };
        });

        setTiles(updatedTiles.filter((t) => t.y < CANVAS_HEIGHT));

        // Spawn new tile when last tile reaches top
        if (tiles.length > 0) {
          const lastTile = tiles[tiles.length - 1];
          if (lastTile.y + speed >= 0) {
            const newY = -TILE_HEIGHT - (0 - lastTile.y);
            spawnTile(newY);
          }
        }

        // Update floating texts
        const updatedTexts = floatingTexts.map((text) => ({
          ...text,
          y: text.y + speed,
        }));
        setFloatingTexts(updatedTexts.filter((t) => t.y - t.initialY < 100));
      }

      // Draw tiles
      tiles.forEach((tile) => {
        if (tile.alive) {
          // Black tile
          ctx.fillStyle = '#000000';
          ctx.fillRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);

          // Purple border (4px)
          ctx.strokeStyle = '#bf40bf';
          ctx.lineWidth = 4;
          ctx.strokeRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);

          // Blue border (2px)
          ctx.strokeStyle = '#19efef';
          ctx.lineWidth = 2;
          ctx.strokeRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
        } else if (!tile.clicked) {
          // Faded tile (clicked)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
        }
      });

      // Draw floating "+1" texts
      ctx.fillStyle = 'white';
      ctx.font = '32px Arial';
      floatingTexts.forEach((text) => {
        ctx.fillText('+1', text.x, text.y);
      });

      // Draw score and high score
      ctx.fillStyle = 'white';
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Score : ${score}`, 70, 40);
      ctx.fillText(`High : ${highScore}`, 200, 40);

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
  }, [tiles, floatingTexts, gameOver, score, highScore, spawnTile, countdown, gameStarted]);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setTiles([]);
    setFloatingTexts([]);
    setNextTileId(0);
    setNextTextId(0);
    setCountdown(3);
    setOverlayIndex(0);
    frameCount.current = 0;
    
    // Spawn first tile
    setTimeout(() => {
      const column = Math.floor(Math.random() * 4);
      const firstTile: Tile = {
        id: 0,
        x: column * TILE_WIDTH,
        y: -TILE_HEIGHT,
        column,
        alive: true,
        clicked: false,
        note: getRandomNote(),
      };
      setTiles([firstTile]);
      setNextTileId(1);
    }, 3000);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setTiles([]);
    setFloatingTexts([]);
    setNextTileId(0);
    setCountdown(3);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  // Game over overlay animation
  useEffect(() => {
    if (gameOver && overlayIndex <= 20) {
      const timer = setInterval(() => {
        setOverlayIndex((prev) => prev + 1);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [gameOver, overlayIndex]);

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
      {/* Sound Toggle */}
      {gameStarted && !gameOver && countdown <= 0 && (
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
            src="/piano/piano.png" 
            alt="Piano"
            style={{ width: '212px', height: '212px' }}
          />
          <img 
            src="/piano/title.png" 
            alt="Piano Tiles"
            style={{ width: '200px' }}
          />
          <img 
            src="/piano/start.png" 
            alt="Start"
            onClick={startGame}
            style={{ width: '120px', cursor: 'pointer', marginTop: '20px' }}
          />
        </div>
      )}

      {/* Countdown */}
      {gameStarted && countdown > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '80px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: 15,
          }}
        >
          {countdown}
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
          cursor: gameStarted && !gameOver && countdown <= 0 ? 'pointer' : 'default',
          background: '#1a1a2e',
        }}
      />

      {/* Game Over Screen */}
      {gameOver && overlayIndex > 20 && (
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
