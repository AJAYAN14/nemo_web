"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import styles from "./page.module.css";
import { statisticsService } from "@/lib/services/statisticsService";
import { supabase } from "@/lib/supabase";
import { HistorySummaryCard } from "@/components/statistics/HistorySummaryCard";
import { CollapsibleHistoryList } from "@/components/statistics/CollapsibleHistoryList";
import { SakuraLoader } from "@/components/common/SakuraLoader";

export default function HistoricalStatisticsPage() {
  const router = useRouter();

  // 1. Fetch current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // 2. Fetch all learned items
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["all-learned-items", user?.id],
    queryFn: () => statisticsService.getAllLearnedItems(user!.id),
    enabled: !!user,
  });

  if (!user || isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <SakuraLoader />
        <p className={styles.loadingText}>整理学习资产中...</p>
      </div>
    );
  }

  const words = historyData?.words.learned || [];
  const grammars = historyData?.grammars.learned || [];

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>历史统计</h1>
      </header>

      <div className={styles.content}>
        {/* Cumulative Summary */}
        <HistorySummaryCard 
          totalWords={words.length} 
          totalGrammars={grammars.length} 
        />

        {/* Learned Words List */}
        <CollapsibleHistoryList 
          title={`已学单词 (${words.length})`}
          items={words}
          onItemClick={(id) => router.push(`/library/word/${id}`)}
          emptyMessage="暂无已学单词，快去开启新的学习吧！"
        />

        {/* Learned Grammars List */}
        <CollapsibleHistoryList 
          title={`已学语法 (${grammars.length})`}
          items={grammars}
          onItemClick={(id) => router.push(`/library/grammar/${id}`)}
          emptyMessage="暂无已学语法，快去挑战高阶语法吧！"
        />
      </div>
    </main>
  );
}
