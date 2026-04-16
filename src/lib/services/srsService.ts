import { FsrsAlgorithm, FsrsRating, DEFAULT_PARAMETERS } from '@/lib/srs/fsrs';
import { StudyItem, StudyConfig } from '@/types/study';
import { RatingAction } from '@/types/ratingAction';
import { buildFsrsDeterministicSeed } from '@/lib/services/fsrsSeed';

export const fsrs = new FsrsAlgorithm();

/**
 * srsService - Pure SRS logic and FSRS 6 engine coordination.
 * Decoupled from Database/Supabase for better testability and performance.
 */
export const srsService = {
  /**
   * Determine whether a rating should advance a short-term step or graduate.
   * Based on Android's state machine logic.
   */
  evaluateRatingAction(item: StudyItem, rating: FsrsRating, config: StudyConfig): RatingAction {
    // State classification. isRelearning is strictly state===3 only.
    // The old `state===1 && reps>0` branch was a semantic zombie — buildRequeueUpdate
    // always sets state=3 on Again, so that path is never reachable in practice.
    const isRelearning = item.progress.state === 3;
    const isReview = item.progress.state === 2;

    const learningSteps = config.learningSteps || [1, 10];
    const relearningSteps = config.relearningSteps || [10];

    // Leech check: only applies to graduated cards (Review or Relearning).
    // New cards in learning steps must NOT trigger leech — they have not yet
    // been consolidated into long-term memory, so lapses there are expected.
    if (rating === FsrsRating.Again && (isReview || isRelearning)) {
      const threshold = config.leechThreshold || 5;
      if ((item.progress.lapses + 1) >= threshold) {
        const action = config.leechAction === 'bury_today' ? 'bury_today' : 'skip';
        return { 
          type: 'leech' as const, 
          action,
          fallbackDelay: relearningSteps[0] || 1
        };
      }
    }

    // Hybrid state machine
    if (isReview) {
      if (rating === FsrsRating.Again) {
        return { type: 'requeue' as const, nextStep: 0, delayMins: relearningSteps[0] || 10 };
      }
      return { type: 'graduate' as const };
    }

    const steps = isRelearning ? relearningSteps : learningSteps;
    const currentStep = item.step || 0;

    if (rating === FsrsRating.Again) {
      return { type: 'requeue' as const, nextStep: 0, delayMins: steps[0] || 1 };
    } else if (rating === FsrsRating.Hard) {
      return { type: 'requeue' as const, nextStep: currentStep, delayMins: steps[currentStep] || 1 };
    } else if (rating === FsrsRating.Good) {
      if (currentStep < steps.length - 1) {
        return { type: 'requeue' as const, nextStep: currentStep + 1, delayMins: steps[currentStep + 1] || 10 };
      } else {
        return { type: 'graduate' as const };
      }
    } else {
      return { type: 'graduate' as const };
    }
  },

  /**
   * Calculate preview intervals for UI display.
   */
  calculatePreviews(item: StudyItem, config: StudyConfig): Record<number, string> {
    const intervals: Record<number, string> = {};
    const userId = item.progress.user_id;

    for (let q = 1; q <= 4; q++) {
      let ratingFsrs = FsrsRating.Again;
      if (q === 2) ratingFsrs = FsrsRating.Hard;
      if (q === 3) ratingFsrs = FsrsRating.Good;
      if (q === 4) ratingFsrs = FsrsRating.Easy;

      const action = this.evaluateRatingAction(item, ratingFsrs, config);
      
      if (action.type === 'requeue' || action.type === 'leech') {
        const delay = action.type === 'requeue' ? action.delayMins : action.fallbackDelay;
        intervals[q] = delay < 1 ? "< 1m" : `${delay}m`;
      } else {
        const progress = item.progress;
        const elapsedDays = progress.last_review 
          ? Math.max(0, (new Date().getTime() - new Date(progress.last_review).getTime()) / 86400000) 
          : 0;
        
        const currentState = progress.reps > 0 ? { stability: progress.stability, difficulty: progress.difficulty } : null;
        const newState = fsrs.step(currentState, ratingFsrs, elapsedDays);
        
        // Apply Fuzzing to previews to match actual scheduler
        const seed = buildFsrsDeterministicSeed(userId, item.id);
        const days = fsrs.nextIntervalDaysWithFuzz(newState.stability, seed);
        
        intervals[q] = this.formatInterval(days);
      }
    }
    return intervals;
  },

  formatInterval(days: number): string {
    if (days < 1) return "< 1d";
    if (days < 30) return `${Math.round(days)}d`;
    if (days < 365) return `${Math.round(days / 30)}mo`;
    return `${Math.round(days / 36.5) / 10}y`;
  },

  applyOptimizedParameters(params: number[]) {
    fsrs.setParameters(params);
  },

  resetParameters() {
    fsrs.setParameters(DEFAULT_PARAMETERS);
  }
};
