"use client";

import React, { useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { studyService } from "@/lib/services/studyService";
import { mixSessionItems } from "@/lib/services/sessionPolicy";
import { LearnSession } from "./LearnSession";
import { supabase } from "@/lib/supabase";
import styles from "./LearnSession.module.css";
import { ItemType } from "@/types/study";
import { NemoButton } from "@/components/ui/NemoButton";
import { settingsService } from "@/lib/services/settingsService";
import { SakuraLoader } from "@/components/common/SakuraLoader";
import { sessionPersistence } from "@/lib/services/sessionPersistence";

function LearnPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as ItemType | null;

  // 1. Get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // 2. Fetch due items
  const { data: studyData, isLoading: itemsLoading, error } = useQuery({
    queryKey: ["due-items", user?.id, type],
    queryFn: async () => {
      if (typeof window !== 'undefined') {
        console.log(`[LearnPage] Initializing session - User: ${user?.id}, Mode: ${type || 'ALL'}`);
      }
      
      const studyConfig = await settingsService.getStudyConfig();
      console.log(`[LearnPage] Current Config:`, studyConfig);

      if (!user) throw new Error("User not found");

      const savedSession = sessionPersistence.loadSession('learn');
      let savedSessionItemsForMode: Awaited<ReturnType<typeof studyService.getDueItems>> = [];
      if (savedSession?.ids?.length) {
        savedSessionItemsForMode = await studyService.getSessionItemsByProgressIds(
          user.id,
          savedSession.ids,
          type || undefined
        );
      }
      const hasReusableSessionForMode = savedSessionItemsForMode.length > 0;

      // 1. Auto-seed only when current user+mode has no reusable saved session.
      // This avoids both duplicated seeding and cross-user/cross-mode false positives.
      if (!hasReusableSessionForMode) {
        const dailyGoal = (!type || type === 'word') ? studyConfig.dailyGoal : 0;
        const grammarDailyGoal = (!type || type === 'grammar') ? studyConfig.grammarDailyGoal : 0;

        console.log(`[LearnPage] Seeding items... (words: ${dailyGoal}, grammars: ${grammarDailyGoal})`);
        await studyService.seedDailyNewItems(user.id, dailyGoal, grammarDailyGoal, studyConfig.resetHour || 4, studyConfig.level, studyConfig.isRandom);
      } else {
        console.log(`[LearnPage] Skip seeding: reusable session detected for this mode (${savedSessionItemsForMode.length} items).`);
      }
      
      // 2. Fetch due items by current window
      const dueItems = await studyService.getDueItems(user.id, 50, type || undefined, studyConfig.resetHour || 4);

      // Resume stability: include cards from saved session even if they are
      // currently outside due/learnAhead window, so re-entering does not drop them.
      let resumeItems: typeof dueItems = [];
      if (savedSessionItemsForMode.length > 0) {
        const dueIdSet = new Set(dueItems.map((item) => item.id));
        const missingSessionIds = savedSessionItemsForMode
          .map((item) => item.id)
          .filter((id) => !dueIdSet.has(id));
        if (missingSessionIds.length > 0) {
          resumeItems = await studyService.getSessionItemsByProgressIds(user.id, missingSessionIds, type || undefined);
        }
      }

      const mergedMap = new Map<string, (typeof dueItems)[number]>();
      dueItems.forEach((item) => mergedMap.set(item.id, item));
      resumeItems.forEach((item) => {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      });

      const items = Array.from(mergedMap.values());
      console.log(`[LearnPage] Fetched ${dueItems.length} due + ${resumeItems.length} resumed = ${items.length} session items.`);

      // 3. Sandwich Mix: interleave new/learning items among mature reviews
      // matches the new strict definition: Review = State 2
      const reviewItemsForMix = items.filter(i => i.progress.state === 2);
      const newItemsForMix = items.filter(i => i.progress.state !== 2); // Includes New (0) and Learning (1, 3)
      const mixedItems = mixSessionItems(reviewItemsForMix, newItemsForMix);
      console.log(`[LearnPage] Sandwich Mix applied: ${reviewItemsForMix.length} reviews + ${newItemsForMix.length} new → ${mixedItems.length} mixed`);

      // 4. Fetch today's stats for progress bar relative tracking
      const { statisticsService } = await import('@/lib/services/statisticsService');
      const todayStats = await statisticsService.getTodayStats(user.id, studyConfig.resetHour || 4);

      return { items: mixedItems, config: studyConfig, todayStats };
    },
    enabled: !!user && !userLoading,
    staleTime: 0, // Always stale
    gcTime: 0, // Drop cache on unmount to avoid stale session restore
    refetchOnWindowFocus: false, // Stop reload on tab switch
    refetchOnMount: 'always', // Always fetch fresh when entering Learn page
  });

  if (userLoading || itemsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <SakuraLoader />
          <p className={styles.loadingText}>正在准备今日学习内容...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  const items = studyData?.items;
  const config = studyData?.config;
  const todayStats = studyData?.todayStats;

  if (error || !items || items.length === 0) {
    const isModeSpecific = !!type;
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>
            {isModeSpecific ? `${type === 'word' ? '单词' : '语法'}任务已完成！✨` : '今日任务已完成！✨'}
          </div>
          <p>
            {isModeSpecific 
              ? `目前没有待复习的${type === 'word' ? '单词' : '语法'}。` 
              : '目前没有需要复习的内容。'}
            <br />
            您可以去词库里添加一些新词，或者切换到另一种学习模式。
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <NemoButton onClick={() => router.push('/library')} variant="secondary">
               前往词库
            </NemoButton>
            <NemoButton onClick={() => router.push('/')}>
               回首页
            </NemoButton>
          </div>
        </div>
      </div>
    );
  }

  const sessionKey = `${user.id}:${type || 'all'}:${items.map(i => i.id).join(',')}`;

  return (
    <LearnSession
      key={sessionKey}
      userId={user.id}
      initialItems={items}
      config={config!}
      mode={type || undefined}
      todayStats={todayStats}
    />
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.emptyState}><SakuraLoader /><p className={styles.loadingText}>正在准备学习内容...</p></div></div>}>
      <LearnPageContent />
    </Suspense>
  );
}
