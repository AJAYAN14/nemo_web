import { describe, expect, it, vi } from 'vitest';
import { invalidateStudyQueries, studyQueryKeys } from '@/lib/services/studyQueryKeys';

describe('studyQueryKeys', () => {
  it('builds today-stats query key in a stable shape', () => {
    expect(studyQueryKeys.todayStats('user-1', 4, 'N3', 'N2')).toEqual([
      'today-stats',
      'user-1',
      4,
      'N3',
      'N2'
    ]);
  });

  it('builds due-items and review-session query keys', () => {
    expect(studyQueryKeys.dueItems('user-1', 'word')).toEqual(['due-items', 'user-1', 'word']);
    expect(studyQueryKeys.reviewSessionItems('user-1')).toEqual(['review-session-items', 'user-1']);
  });

  it('invalidates today-stats and review-session-items by default', () => {
    const invalidateQueries = vi.fn();

    invalidateStudyQueries({ invalidateQueries });

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['today-stats'] });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['review-session-items'] });
  });

  it('can include due-items invalidation when explicitly requested', () => {
    const invalidateQueries = vi.fn();

    invalidateStudyQueries({ invalidateQueries }, { includeDueItems: true });

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['today-stats'] });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['due-items'] });
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, { queryKey: ['review-session-items'] });
  });
});
