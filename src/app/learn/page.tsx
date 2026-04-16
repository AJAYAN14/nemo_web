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

      // 1. Auto-seed daily limit if new items are insufficient
      const dailyGoal = (!type || type === 'word') ? studyConfig.dailyGoal : 0;
      const grammarDailyGoal = (!type || type === 'grammar') ? studyConfig.grammarDailyGoal : 0;
      
      console.log(`[LearnPage] Seeding items... (words: ${dailyGoal}, grammars: ${grammarDailyGoal})`);
      await studyService.seedDailyNewItems(user.id, dailyGoal, grammarDailyGoal, studyConfig.resetHour || 4, studyConfig.level, studyConfig.isRandom);
      
      // 2. Fetch actual due items with filter
      const items = await studyService.getDueItems(user.id, 50, type || undefined, studyConfig.resetHour || 4);
      console.log(`[LearnPage] Fetched ${items.length} items for the session.`);

      // 3. Sandwich Mix: interleave new items among reviews (Android LearningSessionPolicy parity)
      const dueItems = items.filter(i => i.progress.reps > 0 && !!i.progress.last_review);
      const newItems = items.filter(i => i.progress.reps === 0 || !i.progress.last_review);
      const mixedItems = mixSessionItems(dueItems, newItems);
      console.log(`[LearnPage] Sandwich Mix applied: ${dueItems.length} reviews + ${newItems.length} new → ${mixedItems.length} mixed`);

      // 4. Fetch today's stats for progress bar relative tracking
      const { statisticsService } = await import('@/lib/services/statisticsService');
      const todayStats = await statisticsService.getTodayStats(user.id, studyConfig.resetHour || 4);

      return { items: mixedItems, config: studyConfig, todayStats };
    },
    enabled: !!user && !userLoading,
    staleTime: 1000 * 60 * 10, // 10 minutes: items are fresh for 10 mins
    refetchOnWindowFocus: false, // CRITICAL: Stop reload on tab switch
    refetchOnMount: false, // Don't reload the session logic every time the page mount is cycled
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

  return <LearnSession userId={user.id} initialItems={items} config={config!} mode={type || undefined} todayStats={todayStats} />;
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.emptyState}><SakuraLoader /><p className={styles.loadingText}>正在准备学习内容...</p></div></div>}>
      <LearnPageContent />
    </Suspense>
  );
}
