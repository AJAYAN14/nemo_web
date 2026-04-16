import { supabase } from '@/lib/supabase';
import { ItemType, UserProgress, StudyItem, ReviewResult, StudyConfig } from '@/types/study';
import { srsService } from '@/lib/services/srsService';
import { FsrsRating } from '@/lib/srs/fsrs';
import { FsrsParameterOptimizer, ReviewLog } from '@/lib/srs/parameterOptimizer';
import { statisticsService } from './statisticsService';
import { RatingAction } from '@/types/ratingAction';
import { ratingProcessor } from './ratingProcessor';

/**
 * Study Service — Core logic for library management, SRS processing, and session statistics.
 */
let isSeeding = false;

interface UndoReviewMeta {
  itemType: ItemType;
  itemId: number;
  rating: FsrsRating;
}

export const studyService = {
  async applyStudyRecordDelta(
    userId: string,
    epochDay: number,
    field: 'learned_words' | 'learned_grammars' | 'reviewed_words' | 'reviewed_grammars',
    delta: 1 | -1
  ): Promise<void> {
    // Prefer DB-side atomic update to avoid lost increments under concurrent requests.
    const rpcResult = await supabase.rpc('fn_apply_study_record_delta', {
      p_user_id: userId,
      p_epoch_day: epochDay,
      p_field: field,
      p_delta: delta
    });

    if (!rpcResult.error) {
      return;
    }

    // Fallback for environments where RPC is not deployed yet.
    const { data } = await supabase
      .from('study_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', epochDay)
      .maybeSingle();

    const record = data || {
      user_id: userId,
      date: epochDay,
      learned_words: 0,
      learned_grammars: 0,
      reviewed_words: 0,
      reviewed_grammars: 0
    };

    const nextValue = Math.max(0, Number(record[field] || 0) + delta);

    const { error: upsertError } = await supabase
      .from('study_records')
      .upsert(
        {
          ...record,
          [field]: nextValue,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,date' }
      );

    if (upsertError) {
      throw upsertError;
    }
  },

  /**
   * Get the learning day for a given time and reset hour.
   */
  getLearningDay(date: Date, resetHour: number = 4): number {
    return statisticsService.getLearningDay(date, resetHour);
  },

  /**
   * Add a word or grammar to the user's study library
   */
  async addToLibrary(userId: string, itemType: ItemType, itemId: number): Promise<UserProgress> {
    const { data: itemData } = await supabase
      .from(itemType === 'word' ? 'dictionary_words' : 'dictionary_grammars')
      .select('level')
      .eq('id', itemId)
      .single();
    
    const level = itemData?.level || 'N5';

    const { data, error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        item_type: itemType,
        item_id: itemId,
        next_review: new Date().toISOString(), // Available immediately
        level
      }, { onConflict: 'user_id,item_type,item_id' })
      .select()
      .single();

    if (error) throw error;
    return data as UserProgress;
  },

  /**
   * Auto seed daily new items from the dictionary if the queue is empty
   * Now optimized using Supabase RPC for faster server-side processing
   */
  async seedDailyNewItems(
    userId: string, 
    dailyGoal: number, 
    grammarDailyGoal: number, 
    resetHour: number,
    level?: string, 
    isRandom = true,
    providedEpochDay?: number
  ): Promise<void> {
    if (isSeeding) return;
    isSeeding = true;

    try {
      // Keep daily seeding aligned with the current session day when available.
      const epochDay = providedEpochDay ?? this.getLearningDay(new Date(), resetHour);

      const promises: PromiseLike<{ error: unknown | null }>[] = [];

      // === 1. Seed Words ===
      if (dailyGoal > 0) {
        promises.push(
          supabase.rpc('fn_seed_daily_new_items', {
            p_user_id: userId,
            p_item_type: 'word',
            p_limit: dailyGoal,
            p_level: level || 'ALL',
            p_epoch_day: epochDay,
            p_is_random: isRandom
          })
        );
      }

      // === 2. Seed Grammars ===
      if (grammarDailyGoal > 0) {
        promises.push(
          supabase.rpc('fn_seed_daily_new_items', {
            p_user_id: userId,
            p_item_type: 'grammar',
            p_limit: grammarDailyGoal,
            p_level: level || 'ALL',
            p_epoch_day: epochDay,
            p_is_random: isRandom
          })
        );
      }

      if (promises.length > 0) {
        const results = await Promise.all(promises);
        results.forEach((res) => {
          if (res.error) {
            console.error("[StudyService.seedDailyNewItems] RPC Error:", res.error);
          }
        });
      }
    } finally {
      isSeeding = false;
    }
  },

  /**
   * Fetch all items currently due for review
   */
  async getDueItems(
    userId: string,
    limit?: number,
    itemType?: ItemType,
    resetHour?: number
  ): Promise<StudyItem[]> {
    const now = new Date().toISOString();
    
    // 1. Fetch due progress records
    const { statisticsService } = await import('./statisticsService');
    const { settingsService } = await import('./settingsService');
    const config = await settingsService.getStudyConfig();
    
    const effectiveResetHour = resetHour ?? 4;
    const learnAheadMinutes = config.learnAheadLimit || 20;
    const nowWithBuffer = new Date(Date.now() + learnAheadMinutes * 60000).toISOString();
    const currentEpochDay = this.getLearningDay(new Date(), effectiveResetHour);

    let query = supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('state', [0, 1, 2, 3])
      .lte('next_review', nowWithBuffer)
      .lte('buried_until', currentEpochDay); // [BEST PRACTICE] Skip buried items

    if (config.level && config.level !== 'ALL') {
      query = query.eq('level', config.level);
    }

    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    let orderedQuery = query
      .order('next_review', { ascending: true })
      .order('id', { ascending: true }); // Stable sort

    if (typeof limit === 'number' && limit > 0) {
      orderedQuery = orderedQuery.limit(limit);
    }

    const { data: progressList, error } = await orderedQuery;

    if (error) throw error;
    
    console.log(`[StudyService.getDueItems] Found ${progressList?.length || 0} due progress records for user ${userId} (type: ${itemType || 'ALL'}, resetHour: ${effectiveResetHour})`);
    
    if (!progressList || progressList.length === 0) return [];

    // 2. Resolve content (Words and Grammars)
    const wordIds = progressList.filter(p => p.item_type === 'word').map(p => p.item_id);
    const grammarIds = progressList.filter(p => p.item_type === 'grammar').map(p => p.item_id);
    
    console.log(`[StudyService.getDueItems] Resolving content - Words: ${wordIds.length}, Grammars: ${grammarIds.length}`);

    const [wordsRes, grammarsRes] = await Promise.all([
      wordIds.length > 0 
        ? supabase.from('dictionary_words').select('*').in('id', wordIds)
        : Promise.resolve({ data: [] }),
      grammarIds.length > 0
        ? supabase.from('dictionary_grammars').select('*').in('id', grammarIds)
        : Promise.resolve({ data: [] })
    ]);

    const words = wordsRes.data || [];
    const grammars = grammarsRes.data || [];
    
    console.log(`[StudyService.getDueItems] Dictionary Result - Words: ${words.length}, Grammars: ${grammars.length}`);

    // 3. Map back to StudyItems
    const studyItems = progressList.map(progress => {
      const content = progress.item_type === 'word'
        ? words.find(w => Number(w.id) === Number(progress.item_id))
        : grammars.find(g => Number(g.id) === Number(progress.item_id));

      if (!content) {
        console.warn(`[StudyService.getDueItems] Missing dictionary content for ${progress.item_type} ID: ${progress.item_id}. This progress record may be orphaned.`);
      }

      let badge: 'NEW' | 'REVIEW' | 'RELEARN' = 'REVIEW';
      if (progress.state === 0) badge = 'NEW';
      else if (progress.state === 1 || progress.state === 3) badge = 'RELEARN';

      return {
        id: progress.id,
        type: progress.item_type,
        content,
        badge,
        step: progress.learning_step || 0,
        dueTime: progress.next_review ? new Date(progress.next_review).getTime() : 0,
        progress
      } as StudyItem;
    }).filter(item => item.content); 
    
    if (studyItems.length < progressList.length) {
      console.log(`[StudyService.getDueItems] Final mapped items: ${studyItems.length} (Filtered out ${progressList.length - studyItems.length} items with missing content)`);
    }
    
    return studyItems;
  },

  /**
   * Fetch all leech (suspended) items for a user
   */
  async getLeeches(userId: string): Promise<StudyItem[]> {
    const { data: progressList, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('state', -1)
      .order('lapses', { ascending: false });

    if (error) throw error;
    if (!progressList || progressList.length === 0) return [];

    const wordIds = progressList.filter(p => p.item_type === 'word').map(p => p.item_id);
    const grammarIds = progressList.filter(p => p.item_type === 'grammar').map(p => p.item_id);

    const [wordsRes, grammarsRes] = await Promise.all([
      wordIds.length > 0 
        ? supabase.from('dictionary_words').select('*').in('id', wordIds)
        : Promise.resolve({ data: [] }),
      grammarIds.length > 0
        ? supabase.from('dictionary_grammars').select('*').in('id', grammarIds)
        : Promise.resolve({ data: [] })
    ]);

    const words = wordsRes.data || [];
    const grammars = grammarsRes.data || [];

    return progressList.map(progress => {
      const content = progress.item_type === 'word'
        ? words.find(w => w.id === progress.item_id)
        : grammars.find(g => g.id === progress.item_id);

      return {
        id: progress.id,
        type: progress.item_type,
        content,
        badge: progress.state === 0 ? 'NEW' : (progress.state === 3 ? 'RELEARN' : 'REVIEW'),
        step: progress.learning_step || 0,
        dueTime: progress.next_review ? new Date(progress.next_review).getTime() : 0,
        progress
      } as StudyItem;
    }).filter(item => item.content); 
  },

  async logActivity(
    userId: string, 
    type: 'LEARN' | 'REVIEW', 
    itemType: ItemType, 
    epochDay: number
  ): Promise<void> {
    const field = type === 'LEARN'
      ? (itemType === 'word' ? 'learned_words' : 'learned_grammars')
      : (itemType === 'word' ? 'reviewed_words' : 'reviewed_grammars');
    
    try {
      await this.applyStudyRecordDelta(userId, epochDay, field, 1);
    } catch (e) {
      console.error("Failed to log study activity", { userId, epochDay, field, error: e });
      throw e;
    }
  },

  /**
   * Universal review handler that ensures absolute persistence to DB.
   * Matches FSRS 6 behavior from Android core.
   */
  async processReview(
    userId: string, 
    result: ReviewResult, 
    config: StudyConfig, 
    epochDay: number
  ): Promise<UserProgress> {
    const { item, rating } = result;
    const progress = item.progress;
    const action = srsService.evaluateRatingAction(item, rating, config);
    const now = new Date();
    let updateData: Partial<UserProgress>;

    if (action.type === 'leech') {
      updateData = ratingProcessor.buildLeechUpdate(progress, action, now, epochDay);
    } else if (action.type === 'graduate') {
      updateData = ratingProcessor.buildGraduateUpdate(
        progress,
        rating,
        now,
        userId,
        item.id
      ).updateData;
    } else {
      updateData = ratingProcessor.buildRequeueUpdate(progress, rating, action, now);
    }

    const studyField: 'learned_words' | 'learned_grammars' | 'reviewed_words' | 'reviewed_grammars' | null =
      action.type === 'graduate'
        ? (progress.reps === 0
          ? (item.type === 'word' ? 'learned_words' : 'learned_grammars')
          : (item.type === 'word' ? 'reviewed_words' : 'reviewed_grammars'))
        : null;

    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const rpcResult = await supabase.rpc('fn_process_review_atomic', {
      p_user_id: userId,
      p_progress_id: progress.id,
      p_item_type: item.type,
      p_item_id: Number(item.content.id),
      p_rating: rating,
      p_prev_stability: progress.stability,
      p_prev_difficulty: progress.difficulty,
      p_stability: Number(updateData.stability ?? progress.stability),
      p_difficulty: Number(updateData.difficulty ?? progress.difficulty),
      p_elapsed_days: Number(updateData.elapsed_days ?? progress.elapsed_days),
      p_scheduled_days: Number(updateData.scheduled_days ?? progress.scheduled_days),
      p_reps: Number(updateData.reps ?? progress.reps),
      p_lapses: Number(updateData.lapses ?? progress.lapses),
      p_state: Number(updateData.state ?? progress.state),
      p_learning_step: Number(updateData.learning_step ?? progress.learning_step ?? 0),
      p_last_review: (updateData.last_review ?? progress.last_review) || null,
      p_next_review: (updateData.next_review ?? progress.next_review) || null,
      p_buried_until: Number(updateData.buried_until ?? progress.buried_until ?? 0),
      p_epoch_day: epochDay,
      p_study_field: studyField,
      p_study_delta: studyField ? 1 : 0,
      p_request_id: requestId,
      p_expected_last_review: progress.last_review
    });

    if (rpcResult.error) throw rpcResult.error;

    const updated = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    if (!updated) {
      throw new Error('[StudyService.processReview] Atomic RPC returned empty payload');
    }

    return updated as UserProgress;
  },

  /**
   * Database-level Undo Review.
   * Restores the full record to its state before the review.
   */
  async undoReview(
    userId: string,
    itemType: ItemType,
    previousProgress: UserProgress,
    epochDay: number,
    undoMeta?: UndoReviewMeta,
    skipStatsRollback: boolean = false
  ): Promise<void> {
    const isLearn = previousProgress.reps === 0;
    const field = (skipStatsRollback) ? null : (isLearn
      ? (itemType === 'word' ? 'learned_words' : 'learned_grammars')
      : (itemType === 'word' ? 'reviewed_words' : 'reviewed_grammars'));

    // Preferred path: atomic DB rollback (progress + stats + review_logs in one transaction).
    const atomicWithLogsResult = await supabase.rpc('fn_undo_review_atomic_v2', {
      p_user_id: userId,
      p_progress_id: previousProgress.id,
      p_epoch_day: epochDay,
      p_field: field,
      p_stability: previousProgress.stability,
      p_difficulty: previousProgress.difficulty,
      p_reps: previousProgress.reps,
      p_lapses: previousProgress.lapses,
      p_state: previousProgress.state,
      p_learning_step: previousProgress.learning_step,
      p_last_review: previousProgress.last_review,
      p_next_review: previousProgress.next_review,
      p_elapsed_days: previousProgress.elapsed_days,
      p_scheduled_days: previousProgress.scheduled_days,
      p_buried_until: previousProgress.buried_until,
      p_item_type: undoMeta?.itemType ?? itemType,
      p_item_id: undoMeta?.itemId,
      p_rating: undoMeta?.rating,
      p_delta: field ? -1 : 0
    });

    if (!atomicWithLogsResult.error) {
      console.log(`[StudyService.undoReview] Atomic rollback with logs successful for item ${previousProgress.id}`);
      return;
    }

    // Compatibility path: previous atomic RPC without review_logs rollback.
    const atomicResult = await supabase.rpc('fn_undo_review_atomic', {
      p_user_id: userId,
      p_progress_id: previousProgress.id,
      p_epoch_day: epochDay,
      p_field: field,
      p_stability: previousProgress.stability,
      p_difficulty: previousProgress.difficulty,
      p_reps: previousProgress.reps,
      p_lapses: previousProgress.lapses,
      p_state: previousProgress.state,
      p_learning_step: previousProgress.learning_step,
      p_last_review: previousProgress.last_review,
      p_next_review: previousProgress.next_review,
      p_elapsed_days: previousProgress.elapsed_days,
      p_scheduled_days: previousProgress.scheduled_days,
      p_buried_until: previousProgress.buried_until
    });

    if (!atomicResult.error) {
      // Keep logs consistent even when using old RPC.
      if (undoMeta) {
        await this.deleteLatestReviewLog(userId, undoMeta);
      }
      console.log(`[StudyService.undoReview] Atomic rollback successful for item ${previousProgress.id}`);
      return;
    }

    // Compatibility fallback: legacy two-step rollback.
    console.warn('[StudyService.undoReview] Atomic rollback unavailable, fallback to legacy path:', atomicResult.error);

    const { error: progressError } = await supabase
      .from('user_progress')
      .update({
        stability: previousProgress.stability,
        difficulty: previousProgress.difficulty,
        reps: previousProgress.reps,
        lapses: previousProgress.lapses,
        state: previousProgress.state,
        learning_step: previousProgress.learning_step,
        last_review: previousProgress.last_review,
        next_review: previousProgress.next_review,
        elapsed_days: previousProgress.elapsed_days,
        scheduled_days: previousProgress.scheduled_days,
        buried_until: previousProgress.buried_until
      })
      .eq('id', previousProgress.id);

    if (progressError) throw progressError;

    if (field) {
      await this.applyStudyRecordDelta(userId, epochDay, field, -1);
    }
    
    if (undoMeta) {
      await this.deleteLatestReviewLog(userId, undoMeta);
    }
    
    console.log(`[StudyService.undoReview] Database rollback successful for item ${previousProgress.id}`);
  },

  async deleteLatestReviewLog(userId: string, undoMeta: UndoReviewMeta): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_latest_review_log', {
      p_user_id: userId,
      p_item_type: undoMeta.itemType,
      p_item_id: undoMeta.itemId,
      p_rating: undoMeta.rating
    });

    if (error) {
      console.warn('[StudyService.deleteLatestReviewLog] Failed to delete latest review log:', error);
    }
  },

  /**
   * Suspend an item (stop showing it)
   */
  async suspendItem(progressId: string): Promise<void> {
    const { error } = await supabase
      .from('user_progress')
      .update({
        state: -1
      })
      .eq('id', progressId);

    if (error) throw error;
  },

  /**
   * Restore a suspended item (make it New again)
   */
  async restoreItem(progressId: string): Promise<void> {
    const { error } = await supabase
      .from('user_progress')
      .update({
        state: 0, 
        reps: 0,
        lapses: 0,
        stability: 0,
        difficulty: 0,
        last_review: null,
        next_review: new Date().toISOString()
      })
      .eq('id', progressId);

    if (error) throw error;
  },

  /**
   * Bury an item until the next learning day.
   */
  async buryItem(progressId: string, epochDay: number): Promise<void> {
    const buriedUntilDay = epochDay + 1;

    const { error } = await supabase
      .from('user_progress')
      .update({
        buried_until: buriedUntilDay
      })
      .eq('id', progressId);

    if (error) throw error;
  },

  /**
   * Calculate preview intervals (UI representation)
   */
  calculatePreviews(item: StudyItem, config: StudyConfig): Record<number, string> {
    return srsService.calculatePreviews(item, config);
  },

  /**
   * Proxied rating evaluation for UI interval previews.
   */
  evaluateRatingAction(item: StudyItem, rating: FsrsRating, config: StudyConfig) {
    return srsService.evaluateRatingAction(item, rating, config);
  },

  /**
   * Fetch recent logs and calculate optimized FSRS parameters.
   * Matches Android's personalization logic.
   */
  async getOptimizedParameters(userId: string): Promise<number[] | null> {
    try {
      // 1. Fetch the 1500 most recent review logs (matching Android's limit)
      const { data, error } = await supabase
        .from('review_logs')
        .select('rating, stability, difficulty, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1500);

      if (error) throw error;
      if (!data || data.length < 400) return null;

      // 2. Run heuristic optimization
      const result = FsrsParameterOptimizer.optimize(data as ReviewLog[]);
      
      if (result) {
        console.log(
          `[FSRS] Personalization enabled - Samples: ${result.sampleSize}, ` +
          `AgainRate: ${(result.againRate * 100).toFixed(1)}%, ` +
          `HardRate: ${(result.hardRate * 100).toFixed(1)}%`
        );
        return result.parameters;
      }
    } catch (error) {
      console.warn("[FSRS] Personalization skipped due to error:", error);
    }
    return null;
  },

  /**
   * Update the global or session-specific FSRS algorithm instance.
   */
  applyOptimizedParameters(params: number[]) {
    srsService.applyOptimizedParameters(params);
  },

  /**
   * Reset FSRS parameters to default.
   */
  resetParameters() {
    srsService.resetParameters();
  },

  /**
   * Consistency Check: Fetch the latest last_review for a list of progress IDs.
   * Used to detect if items were already reviewed in another session.
   */
  async validateSessionItems(progressIds: string[]): Promise<Record<string, string | null>> {
    if (progressIds.length === 0) return {};

    const { data, error } = await supabase
      .from('user_progress')
      .select('id, last_review')
      .in('id', progressIds);

    if (error) {
      console.warn('[StudyService.validateSessionItems] Error fetching latest status:', error);
      return {};
    }

    return Object.fromEntries(
      (data || []).map(item => [item.id, item.last_review])
    );
  }
};
