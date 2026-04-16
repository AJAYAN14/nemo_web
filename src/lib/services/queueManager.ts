import { StudyItem } from '@/types/study';

export type QueueSelectionResult =
  | { type: 'EMPTY'; index: 0 }
  | { type: 'NEXT'; index: number; dueTime: number }
  | { type: 'WAIT'; index: number; waitingUntil: number; dueTime: number };

interface QueueSelectionParams {
  items: StudyItem[];
  preferredIndex: number;
  learnAheadMs: number;
  now: number;
  manualResumedAt?: number;
  manualOverrideWindowMs?: number;
  manualOverrideIndex?: number;
}

export function findBestDueIndex(items: StudyItem[], preferredIndex: number): { bestIndex: number; minDueTime: number } {
  if (items.length === 0) {
    return { bestIndex: 0, minDueTime: Number.POSITIVE_INFINITY };
  }

  let bestIndex = 0;
  let minDueTime = Number.POSITIVE_INFINITY;

  items.forEach((item, index) => {
    const due = item.dueTime || 0;
    if (due < minDueTime) {
      minDueTime = due;
      bestIndex = index;
    } else if (due === minDueTime) {
      // Tie-break: If multiple items have same due time,
      // stay as close to the preferredIndex as possible, favoring moving forward.
      if (bestIndex < preferredIndex) {
        if (index >= preferredIndex || index > bestIndex) {
          bestIndex = index;
        }
      }
    }
  });

  return { bestIndex, minDueTime };
}

export function selectNextQueueItem(params: QueueSelectionParams): QueueSelectionResult {
  const {
    items,
    preferredIndex,
    learnAheadMs,
    now,
    manualResumedAt,
    manualOverrideWindowMs = 0,
    manualOverrideIndex
  } = params;

  if (items.length === 0) {
    return { type: 'EMPTY', index: 0 };
  }

  const { bestIndex, minDueTime } = findBestDueIndex(items, preferredIndex);

  if (minDueTime > now) {
    const hasManualOverride =
      typeof manualResumedAt === 'number' &&
      now - manualResumedAt < manualOverrideWindowMs &&
      typeof manualOverrideIndex === 'number' &&
      bestIndex === manualOverrideIndex;

    if (minDueTime - now > learnAheadMs && !hasManualOverride) {
      return {
        type: 'WAIT',
        index: bestIndex,
        waitingUntil: minDueTime,
        dueTime: minDueTime
      };
    }
  }

  return {
    type: 'NEXT',
    index: bestIndex,
    dueTime: minDueTime
  };
}
