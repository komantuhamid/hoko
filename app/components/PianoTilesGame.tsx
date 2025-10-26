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
  isError?: boolean;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  opacity: number;
  text: string;
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

interface ColumnHighlight {
  column: number;
  opacity: number;
  timestamp: number;
  type: 'success' | 'error';
}

const CANVAS_WIDTH = 424;  
const CANVAS_HEIGHT = 695; 
const TILE_WIDTH = CANVAS_WIDTH / 4; 
const TILE_HEIGHT = 173;   
const FPS = 60;
const CLICK_DELAY = 100;

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
  const [bgMusicEnabled, setBgMusicEnabled] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [overlayIndex, setOverlayIndex] = useState(0);
  const animationRef = useRef<number>();
  const frameCount = useRef(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const columnBgImageRef = useRef<HTMLImageElement | null>(null);
  const particleIdRef = useRef(0);
  const lastClickTimeRef = useRef<number>(0);
  const audioPoolRef = useRef<Map<string, HTMLAudioElement[]>>(new Map());
  
  const lastClickedColumnRef = useRef<number>(-1);
  const consecutiveClicksRef = useRef<number>(0);
  const lastClickedTimeRef = useRef<number>(0);
  
  const [columnHighlights, setColumnHighlights] = useState<ColumnHighlight[]>([]);
  
  const [melodyIndex, setMelodyIndex] = useState(0);
  const melodyKeys = Object.keys(MELODIES);
  const [currentMelodyKey, setCurrentMelodyKey] = useState(melodyKeys[Math.floor(Math.random() * melodyKeys.length)]);
  const currentMelody = MELODIES[currentMelodyKey as keyof typeof MELODIES];

  const getSpeed = (currentScore: number) => {
    return (30 + 1 * currentScore) * (FPS / 1000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      bgMusicRef.current = new Audio('/piano/sounds/piano-bgmusic.mp3');
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.3;

      const bgImg = document.createElement('img');
      bgImg.src = 'https://up6.cc/2025/10/17614298485651.png';
      bgImageRef.current = bgImg;

      const columnBgImg = document.createElement('img');
      columnBgImg.src = 'https://up6.cc/2025/10/176136230102071.png';
      columnBgImageRef.current = columnBgImg;
    }
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameStarted && bgMusicEnabled && bgMusicRef.current && countdown <= 0) {
      bgMusicRef.current.play().catch(() => {});
    } else if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  }, [gameStarted, bgMusicEnabled, countdown]);

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

  const playSound = useCallback((note: string, tileY: number) => {
    const normalizedY = Math.max(0, Math.min(1, tileY / CANVAS_HEIGHT));
    const volume = 0.3 + (normalizedY * 0.7);
    
    if (!audioPoolRef.current.has(note)) {
      audioPoolRef.current.set(note, []);
    }
    
    const pool = audioPoolRef.current.get(note)!;
    let audio = pool.find(a => a.paused || a.ended);
    
    if (!audio) {
      audio = new Audio(`/piano/sounds/${note}.ogg`);
      pool.push(audio);
    }
    
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume * 0.6;
    audio.play().catch(() => {});
  }, []);

  const playBuzzer = useCallback(() => {
    const audio = new Audio('/piano/sounds/piano-buzzer.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  }, []);

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
      isError: false,
    };
    setTiles((prev) => [...prev, newTile]);
    setNextTileId((prev) => prev + 1);
  }, [nextTileId, getNextNote]);

  const addFloatingText = (column: number, comboCount: number) => {
    const newText: FloatingText = {
      id: Date.now(),
      x: column * TILE_WIDTH + TILE_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      opacity: 1,
      text: `+${comboCount}`,
    };
    setFloatingTexts((prev) => [...prev, newText]);
  };

  const addColumnHighlight = (column: number, type: 'success' | 'error' = 'success') => {
    const newHighlight: ColumnHighlight = {
      column,
      opacity: type === 'error' ? 0 : 0.15,
      timestamp: Date.now(),
      type,
    };
    
    setColumnHighlights((prev) => {
      if (type === 'error') {
        return [];
      }
      return [...prev, newHighlight];
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStarted || gameOver || countdown > 0) return;

    const now = Date.now();
    if (now - lastClickTimeRef.current < CLICK_DELAY) {
      return;
    }
    lastClickTimeRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const clickedColumn = Math.floor(clickX / TILE_WIDTH);

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
      
      const currentColumn = clickedTile.column;
      const timeSinceLastClick = now - lastClickedTimeRef.current;
      
      if (currentColumn !== lastClickedColumnRef.current || timeSinceLastClick > 2000) {
        consecutiveClicksRef.current = 1;
      } else {
        consecutiveClicksRef.current += 1;
      }
      
      lastClickedColumnRef.current = currentColumn;
      lastClickedTimeRef.current = now;
      
      const comboCount = consecutiveClicksRef.current;
      
      setScore((prev) => {
        const newScore = prev + comboCount;
        if (newScore > highScore) {
          setHighScore(newScore);
        }
        return newScore;
      });

      addFloatingText(currentColumn, comboCount);
      addColumnHighlight(currentColumn, 'success');
      
    } else if (!clickedWhiteTile) {
      playBuzzer();
      
      const errorTile: Tile = {
        id: nextTileId,
        x: clickedColumn * TILE_WIDTH,
        y: clickY - (TILE_HEIGHT / 2),
        column: clickedColumn,
        alive: false,
        clicked: false,
        note: '',
        isError: true,
      };
      
      setTiles((prev) => [...prev, errorTile]);
      setNextTileId((prev) => prev + 1);
      
      setGameOver(true);
      setOverlayIndex(0);
      consecutiveClicksRef.current = 0;
      lastClickedColumnRef.current = -1;
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
        
        const updatedHighlights = columnHighlights.map((h) => ({
          ...h,
          opacity: Math.max(0, h.opacity - (h.type === 'error' ? 0.04 : 0.01)),
        }));
        setColumnHighlights(updatedHighlights.filter((h) => h.opacity > 0));
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

      columnHighlights.forEach((highlight) => {
        if (highlight.type === 'success') {
          ctx.fillStyle = `rgba(255, 255, 255, ${highlight.opacity})`;
          ctx.fillRect(highlight.column * TILE_WIDTH, 0, TILE_WIDTH, CANVAS_HEIGHT);
        }
      });

      if (!gameOver) {
        const updatedTiles = tiles.map((tile) => {
          if (!tile.alive && !tile.clicked && !tile.isError) return tile;
          
          const newY = tile.y + speed;

          if (newY + TILE_HEIGHT >= CANVAS_HEIGHT && tile.alive) {
            playBuzzer();
            setGameOver(true);
            setOverlayIndex(0);
            consecutiveClicksRef.current = 0;
            lastClickedColumnRef.current = -1;
            return { ...tile, y: newY, alive: false, isError: true };
          }

          return { ...tile, y: newY };
        });

        setTiles(updatedTiles.filter((t) => t.y < CANVAS_HEIGHT + 100));

        if (tiles.length > 0) {
          const lastTile = tiles[tiles.length - 1];
          if (lastTile.y + speed >= 0) {
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
        if (tile.alive && !tile.clicked && !tile.isError) {
          ctx.save();
          
          const borderRadius = 12;
          ctx.beginPath();
          ctx.moveTo(tile.x + borderRadius, tile.y);
          ctx.lineTo(tile.x + TILE_WIDTH - borderRadius, tile.y);
          ctx.quadraticCurveTo(tile.x + TILE_WIDTH, tile.y, tile.x + TILE_WIDTH, tile.y + borderRadius);
          ctx.lineTo(tile.x + TILE_WIDTH, tile.y + TILE_HEIGHT - borderRadius);
          ctx.quadraticCurveTo(tile.x + TILE_WIDTH, tile.y + TILE_HEIGHT, tile.x + TILE_WIDTH - borderRadius, tile.y + TILE_HEIGHT);
          ctx.lineTo(tile.x + borderRadius, tile.y + TILE_HEIGHT);
          ctx.quadraticCurveTo(tile.x, tile.y + TILE_HEIGHT, tile.x, tile.y + TILE_HEIGHT - borderRadius);
          ctx.lineTo(tile.x, tile.y + borderRadius);
          ctx.quadraticCurveTo(tile.x, tile.y, tile.x + borderRadius, tile.y);
          ctx.closePath();
          
          ctx.clip();
          
          if (columnBgImageRef.current && columnBgImageRef.current.complete) {
            ctx.drawImage(columnBgImageRef.current, tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
          } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
          }
          
          ctx.restore();
          
          ctx.save();
          ctx.shadowColor = 'rgba(50, 184, 198, 0.8)';
          ctx.shadowBlur = 20;
          ctx.strokeStyle = 'rgba(50, 184, 198, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tile.x + borderRadius, tile.y);
          ctx.lineTo(tile.x + TILE_WIDTH - borderRadius, tile.y);
          ctx.quadraticCurveTo(tile.x + TILE_WIDTH, tile.y, tile.x + TILE_WIDTH, tile.y + borderRadius);
          ctx.lineTo(tile.x + TILE_WIDTH, tile.y + TILE_HEIGHT - borderRadius);
          ctx.quadraticCurveTo(tile.x + TILE_WIDTH, tile.y + TILE_HEIGHT, tile.x + TILE_WIDTH - borderRadius, tile.y + TILE_HEIGHT);
          ctx.lineTo(tile.x + borderRadius, tile.y + TILE_HEIGHT);
          ctx.quadraticCurveTo(tile.x, tile.y + TILE_HEIGHT, tile.x, tile.y + TILE_HEIGHT - borderRadius);
          ctx.lineTo(tile.x, tile.y + borderRadius);
          ctx.quadraticCurveTo(tile.x, tile.y, tile.x + borderRadius, tile.y);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
          
          ctx.strokeStyle = 'rgba(50, 184, 198, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tile.x + borderRadius, tile.y);
          ctx.lineTo(tile.x + TILE_WIDTH - borderRadius, tile.y);
          ctx.quadraticCurveTo(tile.x + TILE_WIDTH, tile.y, tile.x + TILE_WIDTH, tile.y + borderRadius);
          ctx.lineTo(tile.x + TILE_WIDTH, tile.y + TILE_HEIGHT - borderRadius);
          ctx.quadraticCurveTo(tile.x + TILE_WIDTH, tile.y + TILE_HEIGHT, tile.x + TILE_WIDTH - borderRadius, tile.y + TILE_HEIGHT);
          ctx.lineTo(tile.x + borderRadius, tile.y + TILE_HEIGHT);
          ctx.quadraticCurveTo(tile.x, tile.y + TILE_HEIGHT, tile.x, tile.y + TILE_HEIGHT - borderRadius);
          ctx.lineTo(tile.x, tile.y + borderRadius);
          ctx.quadraticCurveTo(tile.x, tile.y, tile.x + borderRadius, tile.y);
          ctx.closePath();
          ctx.stroke();
          
          const centerX = tile.x + TILE_WIDTH / 2;
          const centerY = tile.y + TILE_HEIGHT / 2;
          const radius = Math.min(TILE_WIDTH, TILE_HEIGHT) * 0.35;
          
          ctx.strokeStyle = 'rgba(50, 184, 198, 0.6)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(50, 184, 198, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      tiles.forEach((tile) => {
        if (tile.clicked) {
          ctx.fillStyle = 'rgba(80, 80, 80, 0.3)';
          ctx.fillRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
        }
      });

      tiles.forEach((tile) => {
        if (tile.isError) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.fillRect(tile.x, tile.y, TILE_WIDTH, TILE_HEIGHT);
        }
      });

      ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; 
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_WIDTH, 0);
        ctx.lineTo(i * TILE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();
      }

      floatingTexts.forEach((text) => {
        ctx.save();
        ctx.globalAlpha = text.opacity;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text.text, text.x, text.y);
        ctx.restore();
      });

      ctx.fillStyle = 'white';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${score}`, CANVAS_WIDTH / 2, 35);

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
  }, [tiles, floatingTexts, particles, columnHighlights, gameOver, score, highScore, spawnTile, countdown, gameStarted, playBuzzer, playSound]);

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
    setColumnHighlights([]);
    setNextTileId(0);
    setCountdown(3);
    setOverlayIndex(0);
    frameCount.current = 0;
    lastClickTimeRef.current = 0;
    
    consecutiveClicksRef.current = 0;
    lastClickedColumnRef.current = -1;
    lastClickedTimeRef.current = 0;
    
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
        isError: false,
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
    setColumnHighlights([]);
    setNextTileId(0);
    setCountdown(3);
    setMelodyIndex(0);
    lastClickTimeRef.current = 0;
    
    consecutiveClicksRef.current = 0;
    lastClickedColumnRef.current = -1;
    lastClickedTimeRef.current = 0;
  };

  const toggleSound = () => {
    setBgMusicEnabled(!bgMusicEnabled);
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
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
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
            {bgMusicEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        )}

        {!gameStarted && !gameOver && (
          <>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'url(https://up6.cc/2025/10/176143735279391.png)',
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/piano/piano.png" 
                alt="Piano"
                style={{ 
                  width: '280px', 
                  height: '280px',
                  animation: 'spin 3s linear infinite',
                  marginTop: '-50px'
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/piano/title.png" 
                alt="Piano Tiles"
                style={{ width: '250px', height: 'auto' }}
              />
              
              <button
                onClick={startGame}
                style={{
                  width: '280px',
                  height: '90px',
                  background: 'linear-gradient(135deg, #4FC3DC 0%, #2E9FBC 100%)',
                  border: '5px solid white',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  fontSize: '42px',
                  fontWeight: 'bold',
                  color: 'white',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  marginTop: '20px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                }}
              >
                PLAY
              </button>
            </div>
          </>
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
            width: '100vw',
            height: '100vh',
            objectFit: 'fill',
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
                  {bgMusicEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PianoTilesGame;
