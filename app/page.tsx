'use client';

import { useState, useEffect } from 'react';
import RacingGame from './components/RacingGame';
import { supabase } from '@/lib/supabase';
import { 
  Home as HomeIcon, 
  User, 
  Trophy, 
  Gift, 
  Zap,
  Play,
  Award,
  TrendingUp 
} from 'lucide-react';

type GameState = 'menu' | 'playing';
type TabType = 'home' | 'profile' | 'leaderboard' | 'rewards';

interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rank?: number;
  created_at: string;
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerName] = useState('@player123');

  useEffect(() => {
    loadPlayerStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const loadPlayerStats = async () => {
    try {
      const { data } = await supabase
        .from('leaderboard')
        .select('score')
        .eq('username', playerName)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setBestScore(data.score);
      }

      const { count } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .eq('username', playerName);

      setTotalGames(count || 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const rankedData = data?.map((entry, index) => ({
        ...entry,
        rank: index + 1
      })) || [];
      
      setLeaderboard(rankedData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameOver = async (finalScore: number) => {
    setScore(finalScore);
    await saveScore(finalScore);
    
    if (finalScore > bestScore) {
      setBestScore(finalScore);
    }
    
    setTotalGames(prev => prev + 1);
    setGameState('menu');
    
    if (activeTab === 'leaderboard') {
      await fetchLeaderboard();
    }
  };

  const saveScore = async (newScore: number) => {
    try {
      const { error } = await supabase
        .from('leaderboard')
        .insert({
          username: playerName,
          score: newScore
        });
      
      if (error) throw error;
      
      console.log('✅ Score saved!');
      await loadPlayerStats();
      
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  const startGame = () => {
    setScore(0);
    setGameState('playing');
  };

  // ... rest of your render functions stay the same ...
  
  const renderHomeTab = () => (
    <div style={{
      background: 'linear-gradient(145deg, rgba(6,182,212,0.12) 0%, rgba(14,165,233,0.1) 100%)',
      border: '1px solid rgba(6,182,212,0.3)',
      borderRadius: '24px',
      padding: '32px 24px',
      marginBottom: '20px',
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(6,182,212,0.125)'
    }}>
      <div style={{
        width: '96px',
        height: '96px',
        background: 'linear-gradient(145deg, #06b6d4, #0ea5e9)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 12px 28px rgba(6,182,212,0.45)',
        fontSize: '48px'
      }}>
        🏎️
      </div>

      <h1 style={{
        color: 'white',
        fontSize: '36px',
        marginBottom: '12px',
        fontWeight: '800'
      }}>
        Speed Racing
      </h1>

      <p style={{
        color: '#94a3b8',
        fontSize: '15px',
        marginBottom: '32px',
        lineHeight: '1.6',
        maxWidth: '320px',
        margin: '0 auto 32px'
      }}>
        Dodge obstacles, survive as long as you can!
      </p>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(251,191,36,0.15)',
        border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: '12px',
        padding: '8px 16px',
        marginBottom: '24px'
      }}>
        <Award size={18} color="#fbbf24" />
        <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '600' }}>
          {playerName}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '32px',
        maxWidth: '400px',
        margin: '0 auto 32px'
      }}>
        <div style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '16px',
          padding: '20px 16px'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
            Last Score
          </div>
          <div style={{ color: '#10b981', fontSize: '40px', fontWeight: '700', lineHeight: '1' }}>
            {score}
          </div>
        </div>

        <div style={{
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: '16px',
          padding: '20px 16px'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
            Best Score
          </div>
          <div style={{ color: '#fbbf24', fontSize: '40px', fontWeight: '700', lineHeight: '1' }}>
            {bestScore}
          </div>
        </div>
      </div>

      <button
        onClick={startGame}
        style={{
          background: 'linear-gradient(145deg, #06b6d4, #0ea5e9)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          padding: '18px 48px',
          fontSize: '18px',
          fontWeight: '700',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          margin: '0 auto',
          boxShadow: '0 12px 28px rgba(6,182,212,0.45)'
        }}
      >
        <Play size={22} fill="white" />
        Start Playing
      </button>
    </div>
  );

  const renderProfileTab = () => (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '24px',
      padding: '32px 24px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: 'linear-gradient(145deg, #06b6d4, #0ea5e9)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <User size={28} color="white" />
        </div>
        <div>
          <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
            My Profile
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Track your progress</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {[
          { label: 'Username', value: playerName, color: '#fff' },
          { label: 'Best Score', value: bestScore.toString(), color: '#fbbf24' },
          { label: 'Total Games', value: totalGames.toString(), color: '#10b981' },
        ].map((item, index) => (
          <div key={index} style={{
            background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.3)',
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '500' }}>{item.label}</span>
            <span style={{ color: item.color, fontWeight: '700', fontSize: '17px' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLeaderboardTab = () => (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '24px',
      padding: '24px 20px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        justifyContent: 'center'
      }}>
        <Trophy size={28} color="#fbbf24" />
        <h2 style={{ color: 'white', fontSize: '26px', fontWeight: '700' }}>
          Leaderboard
        </h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
          <TrendingUp size={48} color="#06b6d4" style={{ margin: '0 auto 16px', display: 'block' }} />
          Loading...
        </div>
      ) : leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
          <Trophy size={48} color="#64748b" style={{ margin: '0 auto 16px', display: 'block' }} />
          No scores yet. Play to be the first!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: entry.rank && entry.rank <= 3 
                  ? 'linear-gradient(145deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))'
                  : 'rgba(99,102,241,0.06)',
                border: entry.rank && entry.rank <= 3 
                  ? '1px solid rgba(251,191,36,0.3)'
                  : '1px solid rgba(255,255,255,0.08)',
                padding: '16px 18px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: entry.rank && entry.rank <= 3 ? '#fbbf24' : 'rgba(148,163,184,0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '16px',
                  color: entry.rank && entry.rank <= 3 ? '#1e293b' : '#fff'
                }}>
                  {entry.rank && entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                </div>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>
                  {entry.username}
                </span>
              </div>
              <span style={{ 
                color: '#10b981', 
                fontSize: '22px', 
                fontWeight: '700' 
              }}>
                {entry.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRewardsTab = () => (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '24px',
      padding: '48px 32px',
      marginBottom: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(145deg, #06b6d4, #0ea5e9)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <Gift size={40} color="white" />
      </div>
      <h2 style={{ color: 'white', fontSize: '28px', marginBottom: '12px', fontWeight: '700' }}>
        Rewards Coming Soon!
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto' }}>
        Earn rewards by playing and climbing the leaderboard!
      </p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home': return renderHomeTab();
      case 'profile': return renderProfileTab();
      case 'leaderboard': return renderLeaderboardTab();
      case 'rewards': return renderRewardsTab();
      default: return renderHomeTab();
    }
  };

  if (gameState === 'playing') {
    return (
      <div style={{
        height: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(6,182,212,0.3)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(145deg, #06b6d4, #0ea5e9)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              🏎️
            </div>
            <div>
              <div style={{ color: 'white', fontSize: '17px', fontWeight: '700' }}>
                Driving Road
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '500' }}>
                Play & Earn
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              setGameState('menu');
              setActiveTab('home');
            }}
            style={{
              background: 'linear-gradient(145deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Zap size={18} />
            {playerName}
          </button>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '76px',
          overflow: 'hidden',
          background: '#0f172a'
        }}>
          <RacingGame onGameOver={handleGameOver} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(6,182,212,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            background: 'linear-gradient(145deg, #06b6d4, #0ea5e9)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            🏎️
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '17px', fontWeight: '700' }}>
              Driving Road
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '500' }}>
              Play & Earn
            </div>
          </div>
        </div>

        <button style={{
          background: 'linear-gradient(145deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Zap size={18} />
          {playerName}
        </button>
      </div>

      <div style={{
        flex: 1,
        padding: '24px 20px',
        paddingBottom: '100px',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%',
        overflow: 'auto'
      }}>
        {renderTabContent()}

        <div style={{
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
          padding: '16px 0',
          fontWeight: '500'
        }}>
          <p>{totalGames} Games Played · Progressive Difficulty</p>
        </div>
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(6,182,212,0.3)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-around',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}>
        {[
          { id: 'home', Icon: HomeIcon, label: 'Home' },
          { id: 'profile', Icon: User, label: 'Profile' },
          { id: 'leaderboard', Icon: Trophy, label: 'Leaderboard' },
          { id: 'rewards', Icon: Gift, label: 'Rewards' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              background: activeTab === tab.id ? 'rgba(6,182,212,0.125)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <tab.Icon 
              size={22} 
              color={activeTab === tab.id ? '#06b6d4' : '#94a3b8'} 
            />
            <span style={{
              color: activeTab === tab.id ? '#06b6d4' : '#94a3b8',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? '600' : '500'
            }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
