"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ChevronLeft } from "lucide-react";
import styles from "./page.module.css";
import { statisticsService } from "@/lib/services/statisticsService";
import { HeatmapGrid } from "@/components/statistics/HeatmapGrid";
import { StatsHighlight } from "@/components/statistics/StatsHighlight";
import { SakuraLoader } from "@/components/common/SakuraLoader";

export default function HeatmapPage() {
  const router = useRouter();
  const [resetHour] = useState(() => {
    if (typeof window === "undefined") return 4;
    const stored = localStorage.getItem("nemo_study_settings");
    if (!stored) return 4;
    try {
      const config = JSON.parse(stored) as { resetHour?: number };
      return typeof config.resetHour === "number" ? config.resetHour : 4;
    } catch {
      return 4;
    }
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["heatmap-data", user?.id],
    queryFn: () => statisticsService.getHeatmapData(user!.id, resetHour),
    enabled: !!user,
  });

  const { data: highlights, isLoading: highlightsLoading } = useQuery({
    queryKey: ["activity-highlights", user?.id],
    queryFn: () => statisticsService.getActivityHighlights(user!.id, resetHour),
    enabled: !!user,
  });

  if (!user || heatmapLoading || highlightsLoading) {
    return (
      <div className={styles.loadingScreen}>
        <SakuraLoader />
        <p className={styles.loadingText}>深度同步数据中...</p>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>学习热力图</h1>
        <div className={styles.headerSpacer} />
      </header>

      <div className={styles.scrollContent}>
        {/* Heatmap Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>年度回顾</h2>
          <HeatmapGrid data={heatmapData || []} />
        </section>

        {/* Highlights Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>数据高光</h2>
          {highlights && (
            <StatsHighlight
              streak={highlights.currentStreak}
              longestStreak={highlights.longestStreak}
              totalActiveDays={highlights.totalActiveDays}
              bestDayCount={highlights.bestDayCount}
              bestDayDate={highlights.bestDayDate}
              dailyAverage={highlights.dailyAverage}
              todayCount={highlights.todayCount}
            />
          )}
        </section>

        <footer className={styles.footer}>
          <p>每一天都在进步，保持节奏！</p>
        </footer>
      </div>
    </main>
  );
}
