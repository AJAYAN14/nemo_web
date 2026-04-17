import { useCallback, useState } from 'react';
import { FsrsRating, StudyItem, UserProgress } from '@/types/study';
import { studyService } from '@/lib/services/studyService';

export interface UndoSnapshot {
  actionType: 'rate' | 'suspend' | 'bury';
  wordList: StudyItem[];
  currentIndex: number;
  completedThisSession: number;
  waitingUntil: number | null;
  item: StudyItem;
  lastRating?: FsrsRating;
  reviewLogItemType: 'word' | 'grammar';
  reviewLogItemId: number;
  previousProgress: UserProgress;
  /** Epoch day captured at the moment of the action. Used by undo to roll back
   *  stats on the correct calendar day even if the user crosses midnight. */
  epochDay: number;
  /** Optional stats bucket written by this rating; null means no stats delta. */
  statsField?: 'learned_words' | 'learned_grammars' | 'reviewed_words' | 'reviewed_grammars' | null;
}

const MAX_UNDO_STACK = 5;

export function useSessionUndo(userId: string, initialStack: UndoSnapshot[] = []) {
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>(initialStack);
  const canUndo = undoStack.length > 0;

  const pushSnapshot = useCallback((snapshot: UndoSnapshot) => {
    setUndoStack((prev) => {
      const next = [...prev, snapshot];
      if (next.length > MAX_UNDO_STACK) {
        next.shift();
      }
      return next;
    });
  }, []);

  const performUndo = useCallback(async (fallbackEpochDay: number) => {
    if (undoStack.length === 0) return null;

    const lastSnapshot = undoStack[undoStack.length - 1];
    // Prefer the epochDay captured at rating time to avoid cross-day stats errors.
    // Fall back to the caller-provided day only for old snapshots without this field.
    const epochDay = lastSnapshot.epochDay ?? fallbackEpochDay;
    const ratingPayload = lastSnapshot.actionType === 'rate' && lastSnapshot.lastRating !== undefined
      ? {
        itemType: lastSnapshot.reviewLogItemType,
        itemId: lastSnapshot.reviewLogItemId,
        rating: lastSnapshot.lastRating
      }
      : undefined;
    
    try {
      // 1. Database Rollback
      await studyService.undoReview(
        userId,
        lastSnapshot.reviewLogItemType,
        lastSnapshot.previousProgress,
        epochDay,
        ratingPayload,
        lastSnapshot.actionType !== 'rate',
        lastSnapshot.actionType === 'rate' ? (lastSnapshot.statsField ?? null) : null
      );

      // 2. Consume snapshot
      setUndoStack((prev) => prev.slice(0, -1));
      
      return lastSnapshot;
    } catch (e) {
      console.error("[useSessionUndo] Rollback failed:", e);
      throw e;
    }
  }, [undoStack, userId]);

  const clearUndo = useCallback(() => {
    setUndoStack([]);
  }, []);

  return {
    canUndo,
    undoStack,
    pushSnapshot,
    performUndo,
    clearUndo
  };
}
