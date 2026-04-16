import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock
  }
}));

describe('studyService.buryItem', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    eqMock.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock });
    rpcMock.mockResolvedValue({ error: null });
  });

  it('uses session-locked day + 1 as buried_until', async () => {
    const { studyService } = await import('@/lib/services/studyService');
    const epochDay = 20557;

    await studyService.buryItem('progress-1', epochDay);

    expect(fromMock).toHaveBeenCalledWith('user_progress');
    expect(updateMock).toHaveBeenCalledWith({ buried_until: 20558 });
    expect(eqMock).toHaveBeenCalledWith('id', 'progress-1');
  });

  it('uses epoch day when seeding daily new items', async () => {
    const { studyService } = await import('@/lib/services/studyService');
    const epochDay = 45678;

    await studyService.seedDailyNewItems('user-1', 2, 1, 4, 'N2', true, epochDay);

    const seedCalls = rpcMock.mock.calls.filter((call) => call[0] === 'fn_seed_daily_new_items');
    expect(seedCalls).toHaveLength(2);

    expect(seedCalls[0][1]).toMatchObject({
      p_user_id: 'user-1',
      p_item_type: 'word',
      p_limit: 2,
      p_level: 'N2',
      p_epoch_day: epochDay,
      p_is_random: true
    });
  });

  it('uses fn_undo_review_atomic_v2 with review log metadata when available', async () => {
    const { studyService } = await import('@/lib/services/studyService');
    const epochDay = 50000;
    rpcMock.mockResolvedValue({ error: null });

    const previousProgress = {
      id: 'progress-undo-1',
      user_id: 'user-undo-1',
      item_type: 'word',
      item_id: 123,
      stability: 2,
      difficulty: 5,
      reps: 0,
      lapses: 0,
      state: 0,
      learning_step: 0,
      last_review: null,
      next_review: null,
      buried_until: 0,
    } as any;

    await studyService.undoReview('user-undo-1', 'word', previousProgress, epochDay, {
      itemType: 'word',
      itemId: 123,
      rating: 1
    });

    expect(rpcMock).toHaveBeenCalledWith('fn_undo_review_atomic_v2', expect.objectContaining({
      p_user_id: 'user-undo-1',
      p_progress_id: 'progress-undo-1',
      p_epoch_day: epochDay,
      p_item_type: 'word',
      p_item_id: 123,
      p_rating: 1
    }));
  });

  it('deletes latest review log when v2 is unavailable but legacy atomic succeeds', async () => {
    const { studyService } = await import('@/lib/services/studyService');
    const epochDay = 50001;

    rpcMock
      .mockResolvedValueOnce({ error: { message: 'v2 missing' } })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    const previousProgress = {
      id: 'progress-undo-2',
      user_id: 'user-undo-2',
      item_type: 'word',
      item_id: 222,
      stability: 2,
      difficulty: 5,
      reps: 0,
      lapses: 0,
      state: 0,
      learning_step: 0,
      last_review: null,
      next_review: null,
      buried_until: 0,
    } as any;

    await studyService.undoReview('user-undo-2', 'word', previousProgress, epochDay, {
      itemType: 'word',
      itemId: 222,
      rating: 3
    });

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'fn_undo_review_atomic_v2', expect.any(Object));
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'fn_undo_review_atomic', expect.any(Object));
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'fn_delete_latest_review_log', {
      p_user_id: 'user-undo-2',
      p_item_type: 'word',
      p_item_id: 222,
      p_rating: 3
    });
  });
});
