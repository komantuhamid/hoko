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
  opacity: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
}

const CANVAS_WIDTH = 288;
const CANVAS_HEIGHT = 512;
const TILE_WIDTH = CANVAS_WIDTH / 4;
const TILE_HEIGHT = 128;
const FPS = 60;

const MELODIES = {
  twinkle: ['c4','c4','g4','g4','a4','a4','g4','f4','f4','e4','e4','d4','d4','c4','g5','g5','f4','f4','e4','e4','d4','g5','g5','f4','f4','e4','e4','d4','c4','c4','g4','g4','a4','a4','g4','f4','f4','e4','e4','d4','d4','c4'],
  happy_birthday: ["g4","g4","a4","g4","c5","b4","g4","g4","a4","g4","d5","c5","g4","g4","g5","e5","c5","b4","a4","f5","f5","e5","c5","d5","c5"],
  jan_gan_man: ['c5','d5','e5','e5','e5','e5','e5','e5','e5','e5','e5','d5','e5','f5','e5','e5','e5','d5','d5','d5','b4','d5','c5','c5','g5','g5','g5','g5','g5','f-5','g5','g5','g5','f-5','a5','g5','f5','f5','f5','e5','e5','f5','d5','f5','e5','e5','e5','e5','e5','d5','g5','g5','g5','f5','f5','e5','e5','e5','d5','d5','d5','d5','b4','d5','c5','c5','d5','e5','e5','e5','e5','d5','e5','f5','e5','f5','g5','g5','g5','f5','e5','d5','f5','e5','e5','e5','d5','d5','d5','d5','b4','d5','c5','g5','g5','g5','f-5','g5','a5','b5','a5','g5','f5','e5','d5','c5'],
  naruto: ['a4','b4','a4','g4','e4','g4','a4','d4','c4','d4','c4','a3','b3','a4','b4','a4','g4','e4','g4','a4','d4','c4','d4','c4','a3'],
  attack_on_titan: ['c-4','c-4','c-4','b3','b3','d4','d4','c-4','b3','c-4','e4','e4','d4','c-4','b3','a3','g3','c-4','e4','d4','c-4','c-4','g-3','c-4','c-4','c-4','b3','b3','d4','d4','c-4','b3','c-4','e4','e4','d4','c-4','b3','a3','g3','c-4','e4','d4','c-4','c-4','g-3']
};

const PianoTilesGame: React.FC<PianoTilesGameProps> = ({ onGameOver: _onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [nextTileId, setNextTileId] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [overlayIndex, setOverlayIndex] = useState(0);
  const animationRef = useRef<number>();
  const frameCount = useRef(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const particleIdRef = useRef(0);
  
  const [melodyIndex, setMelodyIndex] = useState(0);
  const melodyKeys = Object.keys(MELODIES);
  const [currentMelodyKey, setCurrentMelodyKey] = useState(melodyKeys[Math.floor(Math.random() * melodyKeys.length)]);
  const currentMelody = MELODIES[currentMelodyKey as keyof typeof MELODIES];

  const getSpeed = (currentScore: number) => {
    // Better speed - not too slow, not too fast!
    return (25 + 0.7 * currentScore) * (FPS / 1000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      bgMusicRef.current = new Audio('/piano/sounds/piano-bgmusic.mp3');
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.8;

      const bgImg = document.createElement('img');
      bgImg.src = '/piano/bg.png';
      bgImageRef.current = bgImg;
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

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const initialParticles: Particle[] = [];
      for (let i = 0; i < 5; i++) {
        initialParticles.push({
          id: particleIdRef.current++,
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          size: 15 + Math.random() * 10,
          speed: 0.4 + Math.random() * 1,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 3,
        });
      }
      setParticles(initialParticles);
    }
  }, [gameStarted, gameOver]);

  const playSound = (note: string, tileY: number) => {
    if (!soundEnabled) return;
    const normalizedY = Math.max(0, Math.min(1, tileY / CANVAS_HEIGHT));
    const volume = 0.3 + (normalizedY * 0.7);
    const audio = new Audio(`/piano/sounds/${note}.ogg`);
    audio.volume = volume * 0.6;
    audio.play().catch(() => {});
  };

  const playBuzzer = useCallback(() => {
    if (!soundEnabled) return;
    const audio = new Audio('/piano/sounds/piano-buzzer.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  }, [soundEnabled]);

  const getNextNote = useCallback(() => {
    const note = currentMelody[melodyIndex % currentMelody.length];
    setMelodyIndex((prev) => prev + 1);
    return note;
  }, [currentMelody, melodyIndex]);

  const spawnTile = useCallback((yPos: number) => {
    const column = Math.floor(Math.random() * 4);
    const newTile: Tile = {
      id: nextTileId,
      x: column * TILE_WIDTH,
      y: yPos,
      column,
      alive: true,
      clicked: false,
      note: getNextNote(),
    };
    setTiles((prev) => [...prev, newTile]);
    setNextTileId((prev) => prev + 1);
  }, [nextTileId, getNextNote]);

  const addFloatingText = (x: number, y: number) => {
    const newText: FloatingText = {
      id: Date.now(),
      x: x + TILE_WIDTH / 2,
      y: y + TILE_HEIGHT / 2,
      opacity: 1,
    };
    setFloatingTexts((prev) => [...prev, newText]);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStarted || gameOver || countdown > 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let clickedTile = null;
    let clickedWhiteTile = false;

    for (const tile of tiles) {
      if (
        clickX >= tile.x &&
        clickX <= tile.x + TILE_WIDTH &&
        clickY >= tile.y &&
        clickY <= tile.y + TILE_HEIGHT
      ) {
        if (tile.alive && !tile.clicked) {
          clickedTile = tile;
          break;
        } else if (tile.clicked) {
          clickedWhiteTile = true;
          break;
        }
      }
    }

    if (clickedTile) {
      playSound(clickedTile.note, clickedTile.y);
      
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

      addFloatingText(clickedTile.x, clickedTile.y);
    } else if (!clickedWhiteTile) {
      playBuzzer();
      setGameOver(true);
      setOverlayIndex(0);
    }
  };

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

      if (bgImageRef.current && bgImageRef.current.complete) {
        ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      if (frameCount.current % 2 === 0) {
        const updatedParticles = particles.map((p) => {
          let newY = p.y + p.speed;
          const newRotation = p.rotation + p.rotationSpeed;

          if (newY > CANVAS_HEIGHT + 50) {
            newY = -50;
            return {
              ...p,
              x: Math.random() * CANVAS_WIDTH,
              y: newY,
              rotation: newRotation,
            };
          }

          return { ...p, y: newY, rotation: newRotation };
        });
        setParticles(updatedParticles);
      }

      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, 0);
        ctx.lineTo(0, p.size / 2);
        ctx.lineTo(-p.size / 2, 0);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
      });

      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_WIDTH, 0);
        ctx.lineTo(i * TILE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();
      }

      if (!gameOver) {
        const updatedTiles = tiles.map((tile) => {
          if (!tile.alive && !tile.clicked) return tile;
          
          const newY = tile.y + speed;

          if (newY + TILE_HEIGHT >= CANVAS_HEIGHT && tile.alive) {
            playBuzzer();
            setGameOver(true);
            setOverlayIndex(0);
            return { ...tile, y: newY, alive: false };
          }

          return { ...tile, y: newY };
        });

        setTiles(updatedTiles.filter((t) => t.y < CANVAS_HEIGHT + 100));

        if (tiles.length > 0) {
          const lastTile = tiles[tiles.length - 1];
          // NO GAP! Tiles stick together perfectly
          if (lastTile.y >= -10) {
            spawnTile(lastTile.y - TILE_HEIGHT);
          }
        }

        const updatedTexts = floatingTexts.map((text) => ({
          ...text,
          y: text.y - 2,
          opacity: text.opacity - 0.02,
        }));
        setFloatingTexts(updatedTexts.filter((t) => t.opacity > 0));
      }

      tiles.forEach((tile) => {
        if (tile.alive && !tile.clicked) {
          // NO BORDERS - Perfect sticking!
          ctx.fillStyle = '#000000';
          ctx.fillRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
        } else if (tile.clicked) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
        }
      });

      floatingTexts.forEach((text) => {
        ctx.save();
        ctx.globalAlpha = text.opacity;
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+1', text.x, text.y);
        ctx.restore();
      });

      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score : ${score}`, 10, 30);
      ctx.fillText(`High : ${highScore}`, 160, 30);

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
  }, [tiles, floatingTexts, particles, gameOver, score, highScore, spawnTile, countdown, gameStarted, playBuzzer]);

  const startGame = () => {
    const randomKey = melodyKeys[Math.floor(Math.random() * melodyKeys.length)];
    setCurrentMelodyKey(randomKey);
    setMelodyIndex(0);
    
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setTiles([]);
    setFloatingTexts([]);
    setParticles([]);
    setNextTileId(0);
    setCountdown(3);
    setOverlayIndex(0);
    frameCount.current = 0;
    
    setTimeout(() => {
      const column = Math.floor(Math.random() * 4);
      const firstNote = MELODIES[randomKey as keyof typeof MELODIES][0];
      const firstTile: Tile = {
        id: 0,
        x: column * TILE_WIDTH,
        y: -TILE_HEIGHT,
        column,
        alive: true,
        clicked: false,
        note: firstNote,
      };
      setTiles([firstTile]);
      setNextTileId(1);
      setMelodyIndex(1);
    }, 3000);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setTiles([]);
    setFloatingTexts([]);
    setParticles([]);
    setNextTileId(0);
    setCountdown(3);
    setMelodyIndex(0);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

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

      {!gameStarted && !gameOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/piano/bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
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
            style={{ width: '250px', height: 'auto' }}
          />
          <img 
            src="/piano/start.png" 
            alt="Start"
            onClick={startGame}
            style={{ width: '150px', height: 'auto', cursor: 'pointer', marginTop: '20px' }}
          />
        </div>
      )}

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

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        style={{
          display: 'block',
          cursor: gameStarted && !gameOver && countdown <= 0 ? 'pointer' : 'default',
        }}
      />

      {gameOver && overlayIndex > 20 && (
        <>
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
