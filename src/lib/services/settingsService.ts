import { StudyConfig } from '@/types/study';

const DEFAULT_CONFIG: StudyConfig = {
  mode: 'WORDS_ONLY',
  level: 'N5',
  dailyGoal: 20,
  grammarDailyGoal: 5,
  isRandom: true,
  learningSteps: [1, 10],
  relearningSteps: [1, 10],
  learnAheadLimit: 20,
  leechThreshold: 5,
  leechAction: 'skip',
  resetHour: 4,
  isAutoAudioEnabled: true,
  isShowAnswerDelayEnabled: false
};

export const settingsService = {
  async getStudyConfig(): Promise<StudyConfig> {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    
    const stored = localStorage.getItem('nemo_study_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const config = { ...DEFAULT_CONFIG, ...parsed };

        // Data Migration: Map legacy 'limit' names to new 'goal' names
        if (parsed.wordLimit !== undefined && parsed.dailyGoal === undefined) {
          config.dailyGoal = parsed.wordLimit;
        }
        if (parsed.grammarLimit !== undefined && parsed.grammarDailyGoal === undefined) {
          config.grammarDailyGoal = parsed.grammarLimit;
        }

        return config;
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  },

  async updateStudyConfig(config: Partial<StudyConfig>): Promise<void> {
    if (typeof window === 'undefined') return;
    const current = await this.getStudyConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('nemo_study_settings', JSON.stringify(updated));
  },

  formatResetHour(hour: number): string {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    if (hour === 4) return `${timeStr} (推荐)`;
    return timeStr;
  }
};

export const RESET_HOUR_OPTIONS = [0, 2, 4, 5, 6];
export const DAILY_GOAL_OPTIONS = [5, 10, 20, 30, 50];
export const GRAMMAR_GOAL_OPTIONS = [5, 10, 15, 20, 25];
