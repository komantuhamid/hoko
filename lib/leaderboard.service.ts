import { supabase } from './supabase';

export interface LeaderboardEntry {
  id?: string;
  player_name: string;
  score: number;
  rank?: number;
  played_at?: string;
  user_id?: string;
  game_type?: string;
}

export class LeaderboardService {
  private tableName = 'leaderboard';

  // Save new score to Supabase
  async saveScore(
    playerName: string, 
    score: number, 
    userId?: string
  ): Promise<{ rank: number; success: boolean }> {
    try {
      // Insert score into database
      const { error: insertError } = await supabase
        .from(this.tableName)
        .insert({
          player_name: playerName,
          score: score,
          user_id: userId,
          game_type: 'racing',
          played_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving score:', insertError);
        return { rank: 0, success: false };
      }

      // Calculate rank
      const rank = await this.calculateRank(score);
      
      return { rank, success: true };
    } catch (error) {
      console.error('Error in saveScore:', error);
      return { rank: 0, success: false };
    }
  }

  // Calculate player rank based on score
  async calculateRank(score: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .gt('score', score);

      if (error) {
        console.error('Error calculating rank:', error);
        return 0;
      }

      return (count || 0) + 1;
    } catch (error) {
      console.error('Error in calculateRank:', error);
      return 0;
    }
  }

  // Get top scores from leaderboard
  async getTopScores(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      // Add rank numbers
      return (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
    } catch (error) {
      console.error('Error in getTopScores:', error);
      return [];
    }
  }

  // Get player's best score
  async getPlayerBestScore(playerName: string): Promise<LeaderboardEntry | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('player_name', playerName)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching player score:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getPlayerBest Score:', error);
      return null;
    }
  }

  // Get all scores for a player
  async getPlayerScores(playerName: string): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('player_name', playerName)
        .order('score', { ascending: false });

      if (error) {
        console.error('Error fetching player scores:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPlayerScores:', error);
      return [];
    }
  }
}

export const leaderboardService = new LeaderboardService();
