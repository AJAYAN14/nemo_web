import { FsrsRating } from '@/lib/srs/fsrs';
import { fsrs } from '@/lib/services/srsService';
import { UserProgress } from '@/types/study';
import { RatingAction } from '@/types/ratingAction';
import { buildFsrsDeterministicSeed } from '@/lib/services/fsrsSeed';

type LeechAction = Extract<RatingAction, { type: 'leech' }>;
type RequeueAction = Extract<RatingAction, { type: 'requeue' }>;

function getElapsedDays(progress: UserProgress, now: Date): number {
  const lastReviewDate = progress.last_review ? new Date(progress.last_review) : null;
  return lastReviewDate
    ? Math.max(0, (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
}

export const ratingProcessor = {
  buildLeechUpdate(progress: UserProgress, action: LeechAction, now: Date, epochDay: number): Partial<UserProgress> {
    const skips = action.action === 'skip';
    return {
      lapses: progress.lapses + 1,
      state: skips ? -1 : progress.state,
      buried_until: skips ? 0 : epochDay + 1
      // NOTE: next_review is intentionally NOT updated for bury_today.
      // getDueItems filters by `buried_until <= currentEpochDay`, so the item
      // is hidden today regardless of next_review. On the next learning day
      // the buried_until check lifts and the item re-enters the queue naturally.
      // If next_review is in the past at that point, the item is immediately due — correct behavior.
    };
  },

  buildGraduateUpdate(
    progress: UserProgress,
    rating: FsrsRating,
    now: Date,
    userId: string,
    itemId: string
  ): { updateData: Partial<UserProgress> } {
    const elapsedDays = getElapsedDays(progress, now);
    const currentState = progress.reps > 0
      ? { stability: progress.stability, difficulty: progress.difficulty }
      : null;
    const newState = fsrs.step(currentState, rating, elapsedDays);

    let interval: number;
    let newReps: number;

    if (rating === FsrsRating.Again) {
      newReps = progress.reps;
      interval = fsrs.nextIntervalDays(newState.stability);
    } else {
      newReps = progress.reps + 1;
      const seed = buildFsrsDeterministicSeed(userId, itemId);
      interval = fsrs.nextIntervalDaysWithFuzz(newState.stability, seed);
    }

    return {
      updateData: {
        stability: newState.stability,
        difficulty: newState.difficulty,
        elapsed_days: Math.round(elapsedDays),
        scheduled_days: Math.round(interval),
        reps: newReps,
        state: rating === FsrsRating.Again ? 3 : 2,
        last_review: now.toISOString(),
        next_review: new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString(),
        learning_step: 0,
        lapses: rating === FsrsRating.Again ? progress.lapses + 1 : progress.lapses,
        buried_until: 0
      }
    };
  },

  buildRequeueUpdate(
    progress: UserProgress,
    rating: FsrsRating,
    action: RequeueAction,
    now: Date
  ): Partial<UserProgress> {
    const isAgain = rating === FsrsRating.Again;
    const isHard = rating === FsrsRating.Hard;
    let newStateUpdate: Partial<UserProgress> = {};

    if (isAgain || (isHard && progress.reps > 0)) {
      const elapsedDays = getElapsedDays(progress, now);
      const currentState = progress.reps > 0
        ? { stability: progress.stability, difficulty: progress.difficulty }
        : null;
      const newState = fsrs.step(currentState, rating, elapsedDays);
      const interval = fsrs.nextIntervalDays(newState.stability);

      newStateUpdate = {
        stability: newState.stability,
        difficulty: newState.difficulty,
        elapsed_days: Math.round(elapsedDays),
        scheduled_days: Math.round(interval)
      };
    }

    return {
      ...newStateUpdate,
      next_review: new Date(now.getTime() + action.delayMins * 60000).toISOString(),
      learning_step: action.nextStep,
      state: isAgain ? 3 : (progress.reps === 0 ? 1 : progress.state),
      lapses: isAgain ? progress.lapses + 1 : progress.lapses
    };
  }
};