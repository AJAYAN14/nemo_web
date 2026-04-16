import { useCallback, useRef, useState } from 'react';
import { FsrsRating, StudyItem, UserProgress } from '@/types/study';
import { studyService } from '@/lib/services/studyService';
import { sessionPersistence, SavedSessionState } from '@/lib/services/sessionPersistence';

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
}

const MAX_UNDO_STACK = 5;

export function useSessionUndo(userId: string, initialStack: UndoSnapshot[] = []) {
  const [canUndo, setCanUndo] = useState(initialStack.length > 0);
  const undoStackRef = useRef<UndoSnapshot[]>(initialStack);

  const pushSnapshot = useCallback((snapshot: UndoSnapshot) => {
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > MAX_UNDO_STACK) {
      undoStackRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  const performUndo = useCallback(async (fallbackEpochDay: number) => {
    if (undoStackRef.current.length === 0) return null;

    const lastSnapshot = undoStackRef.current[undoStackRef.current.length - 1];
    // Prefer the epochDay captured at rating time to avoid cross-day stats errors.
    // Fall back to the caller-provided day only for old snapshots without this field.
    const epochDay = (lastSnapshot as UndoSnapshot).epochDay ?? fallbackEpochDay;
    
    try {
      // 1. Database Rollback
      await studyService.undoReview(
        userId,
        lastSnapshot.reviewLogItemType,
        lastSnapshot.previousProgress,
        epochDay,
        lastSnapshot.actionType === 'rate' ? {
          itemType: lastSnapshot.reviewLogItemType,
          itemId: lastSnapshot.reviewLogItemId,
          rating: lastSnapshot.lastRating as any
        } : undefined,
        lastSnapshot.actionType !== 'rate'
      );

      // 2. Consume snapshot
      undoStackRef.current.pop();
      setCanUndo(undoStackRef.current.length > 0);
      
      return lastSnapshot;
    } catch (e) {
      console.error("[useSessionUndo] Rollback failed:", e);
      throw e;
    }
  }, [userId]);

  const clearUndo = useCallback(() => {
    undoStackRef.current = [];
    setCanUndo(false);
  }, []);

  return {
    canUndo,
    undoStack: undoStackRef.current,
    pushSnapshot,
    performUndo,
    clearUndo
  };
}
