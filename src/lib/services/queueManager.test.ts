import { describe, expect, it } from 'vitest';
import { findBestDueIndex, selectNextQueueItem } from '@/lib/services/queueManager';
import { StudyItem } from '@/types/study';

function makeItem(id: string, dueTime: number): StudyItem {
  return {
    id,
    type: 'word',
    content: {
      id: Number(id),
      japanese: `jp-${id}`,
      hiragana: `hi-${id}`,
      chinese: `cn-${id}`,
      level: 'N5',
      is_delisted: false
    },
    progress: {
      id,
      user_id: 'u1',
      item_type: 'word',
      item_id: Number(id),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      learning_step: 0,
      last_review: null,
      next_review: null,
      buried_until: 0,
      level: 'N5',
      created_at: new Date().toISOString()
    },
    step: 0,
    dueTime,
    badge: 'NEW'
  };
}

describe('findBestDueIndex', () => {
  it('returns infinity and index 0 for empty list', () => {
    const result = findBestDueIndex([], 0);
    expect(result.bestIndex).toBe(0);
    expect(result.minDueTime).toBe(Number.POSITIVE_INFINITY);
  });

  it('breaks ties with preferred-index side', () => {
    const items = [makeItem('1', 1000), makeItem('2', 1000), makeItem('3', 1200)];
    const result = findBestDueIndex(items, 1);
    expect(result.bestIndex).toBe(1);
    expect(result.minDueTime).toBe(1000);
  });
});

describe('selectNextQueueItem', () => {
  it('returns EMPTY for empty queue', () => {
    const result = selectNextQueueItem({
      items: [],
      preferredIndex: 0,
      learnAheadMs: 60_000,
      now: 1000
    });
    expect(result).toEqual({ type: 'EMPTY', index: 0 });
  });

  it('returns WAIT when best due is outside learn-ahead window', () => {
    const items = [makeItem('1', 10_000), makeItem('2', 12_000)];
    const result = selectNextQueueItem({
      items,
      preferredIndex: 0,
      learnAheadMs: 1000,
      now: 1000
    });

    expect(result.type).toBe('WAIT');
    if (result.type === 'WAIT') {
      expect(result.waitingUntil).toBe(10_000);
      expect(result.index).toBe(0);
    }
  });

  it('returns NEXT when best due is within learn-ahead window', () => {
    const items = [makeItem('1', 1400), makeItem('2', 2000)];
    const result = selectNextQueueItem({
      items,
      preferredIndex: 0,
      learnAheadMs: 500,
      now: 1000
    });

    expect(result.type).toBe('NEXT');
    if (result.type === 'NEXT') {
      expect(result.index).toBe(0);
      expect(result.dueTime).toBe(1400);
    }
  });

  it('respects manual override window for selected index', () => {
    const items = [makeItem('1', 20_000), makeItem('2', 30_000)];
    const now = 1000;

    const result = selectNextQueueItem({
      items,
      preferredIndex: 0,
      learnAheadMs: 1000,
      now,
      manualResumedAt: now - 200,
      manualOverrideWindowMs: 1000,
      manualOverrideIndex: 0
    });

    expect(result.type).toBe('NEXT');
  });
});
