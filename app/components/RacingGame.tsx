'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface RacingGameProps {
  onGameOver?: (score: number) => void;
}

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  image: string;
  type: 'car' | 'barrel' | 'roadblock';
}

interface PlayerCar {
  x: number;
  y: number;
  width: number;
  height: number;
  speedX: number;
  speedY: number;
}

const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 900;
const PLAYER_START_X = 180;
const PLAYER_START_Y = 380;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 70;
const LANE_WIDTH = 90;
const NUM_LANES = 4;
const BASE_OBSTACLE_SPEED = 4;
const SPAWN_INTERVAL = 80;

const OBSTACLE_TYPES = [
  { image: '/racing/car1.png', type: 'car' as const, width: 40, height: 70 },
  { image: '/racing/car2.png', type: 'car' as const, width: 40, height: 70 },
  { image: '/racing/car3.png', type: 'car' as const, width: 40, height: 70 },
  { image: '/racing/car4.png', type: 'car' as const, width: 40, height: 70 },
  { image: '/racing/car5.png', type: 'car' as const, width: 40, height: 70 },
  { image: '/racing/barrel.png', type: 'barrel' as const, width: 50, height: 50 },
  { image: '/racing/roadblock.png', type: 'roadblock' as const, width: 80, height: 40 },
];

export default function RacingGame({ onGameOver }: RacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('playing');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const playerRef = useRef<PlayerCar>({
    x: PLAYER_START_X,
    y: PLAYER_START_Y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speedX: 0,
    speedY: 0
  });

  const obstaclesRef = useRef<GameObject[]>([]);
  const frameCountRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef(0);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const roadOffsetRef = useRef(0);

  const preloadImages = useCallback(() => {
    const imagesToLoad = [
      '/racing/car6.png',
      ...OBSTACLE_TYPES.map(o => o.image)
    ];

    imagesToLoad.forEach(src => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        imagesRef.current.set(src, img);
      };
    });
  }, []);

  const checkCollision = useCallback((obj1: { x: number; y: number; width: number; height: number },
                                       obj2: { x: number; y: number; width: number; height: number }): boolean => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  }, []);

  const spawnObstacle = useCallback(() => {
    const obstacleType = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    const lane = Math.floor(Math.random() * NUM_LANES);
    const x = 40 + (lane * LANE_WIDTH) + (LANE_WIDTH - obstacleType.width) / 2;
    const speedMultiplier = 1 + (frameCountRef.current / 1000);

    const obstacle: GameObject = {
      x,
      y: -obstacleType.height,
      width: obstacleType.width,
      height: obstacleType.height,
      speed: BASE_OBSTACLE_SPEED * speedMultiplier,
      image: obstacleType.image,
      type: obstacleType.type
    };

    obstaclesRef.current.push(obstacle);
  }, []);

  const drawRoad = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, 30, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - 30, 0, 30, CANVAS_HEIGHT);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);

    roadOffsetRef.current += 4;
    if (roadOffsetRef.current > 40) roadOffsetRef.current = 0;

    ctx.save();
    ctx.translate(0, roadOffsetRef.current);

    for (let i = 1; i < NUM_LANES; i++) {
      const x = 40 + i * LANE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, -40);
      ctx.lineTo(x, CANVAS_HEIGHT + 40);
      ctx.stroke();
    }

    ctx.restore();
    ctx.setLineDash([]);
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawRoad(ctx);

    const player = playerRef.current;

    const MOVE_SPEED = 6;
    if (keysRef.current.has('ArrowLeft') && player.x > 40) {
      player.x -= MOVE_SPEED;
    }
    if (keysRef.current.has('ArrowRight') && player.x < CANVAS_WIDTH - 70) {
      player.x += MOVE_SPEED;
    }
    if (keysRef.current.has('ArrowUp') && player.y > 50) {
      player.y -= MOVE_SPEED;
    }
    if (keysRef.current.has('ArrowDown') && player.y < CANVAS_HEIGHT - 100) {
      player.y += MOVE_SPEED;
    }

    const playerImg = imagesRef.current.get('/racing/car6.png');
    if (playerImg) {
      ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
      ctx.fillStyle = '#00f';
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    frameCountRef.current++;
    if (frameCountRef.current % SPAWN_INTERVAL === 0) {
      spawnObstacle();
    }

    const obstacles = obstaclesRef.current;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];

      obstacle.y += obstacle.speed;

      if (obstacle.y > CANVAS_HEIGHT) {
        obstacles.splice(i, 1);
        continue;
      }

      if (checkCollision(player, obstacle)) {
        setGameState('gameover');
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('racingHighScore', score.toString());
        }
        return;
      }

      const obstacleImg = imagesRef.current.get(obstacle.image);
      if (obstacleImg) {
        ctx.drawImage(obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      } else {
        ctx.fillStyle = '#f00';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }
    }

    setScore(Math.floor(frameCountRef.current / 10));

    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${score}`, 20, 40);
    ctx.fillText(`Score: ${score}`, 20, 40);

    const speed = Math.floor(BASE_OBSTACLE_SPEED * (1 + frameCountRef.current / 1000));
    ctx.font = 'bold 20px Arial';
    ctx.strokeText(`Speed: ${speed}`, 20, 70);
    ctx.fillText(`Speed: ${speed}`, 20, 70);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, highScore, drawRoad, checkCollision, spawnObstacle]);

  const startGame = useCallback(() => {
    playerRef.current = {
      x: PLAYER_START_X,
      y: PLAYER_START_Y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speedX: 0,
      speedY: 0
    };

    obstaclesRef.current = [];
    frameCountRef.current = 0;
    roadOffsetRef.current = 0;
    setScore(0);
    setGameState('playing');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
      if (e.key === ' ' && gameState === 'gameover') {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startGame]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    const player = playerRef.current;

    const dx = touchX - (player.x + player.width / 2);
    const dy = touchY - (player.y + player.height / 2);
    const TOUCH_SPEED = 8;

    if (Math.abs(dx) > 10) {
      player.x += Math.sign(dx) * TOUCH_SPEED;
      player.x = Math.max(40, Math.min(CANVAS_WIDTH - 70, player.x));
    }
    if (Math.abs(dy) > 10) {
      player.y += Math.sign(dy) * TOUCH_SPEED;
      player.y = Math.max(50, Math.min(CANVAS_HEIGHT - 100, player.y));
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    preloadImages();

    const saved = localStorage.getItem('racingHighScore');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, [preloadImages]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);

  if (!isMounted) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
        Loading...
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.95)',
          borderRadius: '24px',
          padding: '48px 32px',
          textAlign: 'center',
          border: '2px solid rgba(6,182,212,0.4)',
          boxShadow: '0 16px 48px rgba(6,182,212,0.3)'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '800',
            color: '#ef4444',
            marginBottom: '16px',
            textShadow: '0 0 30px rgba(239,68,68,0.6)'
          }}>
            GAME OVER
          </div>

          <div style={{
            fontSize: '18px',
            color: '#94a3b8',
            marginBottom: '12px'
          }}>
            Your Score
          </div>
          <div style={{
            fontSize: '64px',
            fontWeight: '800',
            color: '#06b6d4',
            marginBottom: '32px',
            textShadow: '0 0 30px rgba(6,182,212,0.6)'
          }}>
            {score}
          </div>

          {score >= highScore && score > 0 && (
            <div style={{
              color: '#fbbf24',
              fontSize: '18px',
              marginBottom: '24px',
              fontWeight: '700',
              textShadow: '0 0 20px rgba(251,191,36,0.5)'
            }}>
              🎉 New High Score! 🎉
            </div>
          )}
          {score < highScore && (
            <div style={{
              color: '#64748b',
              fontSize: '16px',
              marginBottom: '24px'
            }}>
              High Score: {highScore}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column'
          }}>
            <button
              onClick={() => {
                setScore(0);
                startGame();
              }}
              style={{
                background: 'linear-gradient(145deg, #06b6d4, #0ea5e9)',
                color: 'white',
                border: '2px solid rgba(6,182,212,0.5)',
                borderRadius: '16px',
                padding: '18px 32px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(6,182,212,0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(6,182,212,0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(6,182,212,0.4)';
              }}
            >
              🔄 Try Again
            </button>

            <button
              onClick={() => {
                if (onGameOver) onGameOver(score);
              }}
              style={{
                background: 'rgba(30,41,59,0.8)',
                color: '#94a3b8',
                border: '2px solid rgba(71,85,105,0.5)',
                borderRadius: '16px',
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.borderColor = 'rgba(100,116,139,0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
              }}
            >
              🏠 Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

return (
  <div style={{ 
    position: 'relative', 
    width: '100%', 
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    margin: '0',
    boxSizing: 'border-box',
    overflow: 'hidden'
  }}>
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onTouchMove={handleTouchMove}
      onTouchStart={(e) => e.preventDefault()}
      style={{
        touchAction: 'none',
        cursor: 'none',
        display: 'block',
        background: '#333',
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }}
    />
  </div>
);
}
