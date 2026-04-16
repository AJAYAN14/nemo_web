"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ChevronLeft } from "lucide-react";
import calendarStyles from "./calendar.module.css";
import { statisticsService } from "@/lib/services/statisticsService";
import { TodaySummaryCard } from "@/components/statistics/TodaySummaryCard";
import { CalendarWeekView } from "@/components/statistics/CalendarWeekView";
import { CalendarDayDetail } from "@/components/statistics/CalendarDayDetail";
import { SakuraLoader } from "@/components/common/SakuraLoader";

export default function LearningCalendarPage() {
  const router = useRouter();
  const [resetHour, setResetHour] = useState(4);

  useEffect(() => {
    const stored = localStorage.getItem('nemo_study_settings');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        if (config.resetHour !== undefined) setResetHour(config.resetHour);
      } catch { }
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const todayEpoch = useMemo(() => statisticsService.getLearningDay(new Date(), resetHour), [resetHour]);
  const [selectedDate, setSelectedDate] = useState(todayEpoch);

  // Today Stats - 1:1 Parity Data
  const { data: todayStats, isLoading: todayLoading } = useQuery({
    queryKey: ["today-stats", user?.id],
    queryFn: () => statisticsService.getTodayStats(user!.id, resetHour),
    enabled: !!user,
  });

  // Week View Data (Dots etc)
  const { data: weekSummary, isLoading: weekLoading } = useQuery({
    queryKey: ["weekly-summary", user?.id],
    queryFn: () => statisticsService.getWeeklyActivitySummary(user!.id, resetHour),
    enabled: !!user,
  });

  // Detail Panel Data
  const { data: detailedRecord, isLoading: detailedLoading } = useQuery({
    queryKey: ["detailed-record", user?.id, selectedDate],
    queryFn: () => statisticsService.getDetailedRecordForDate(user!.id, selectedDate, resetHour),
    enabled: !!user,
  });

  if (!user || todayLoading || weekLoading) {
    return (
      <div className={calendarStyles.loadingScreen}>
        <SakuraLoader />
        <p className={calendarStyles.loadingText}>深度同步数据中...</p>
      </div>
    );
  }

  return (
    <main className={calendarStyles.container}>
      {/* Header - 1:1 Parity with CommonHeader */}
      <header className={calendarStyles.header}>
        <button className={calendarStyles.backBtn} onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={calendarStyles.title}>学习日历</h1>
        <div className={calendarStyles.headerSpacer} />
      </header>

      <div className={calendarStyles.scrollContent}>
        {/* 1. 今日概览 (Today Summary) */}
        <section className={calendarStyles.section}>
          <h2 className={calendarStyles.sectionTitle}>今日概览</h2>
          <TodaySummaryCard 
            stats={{
              todayLearnedWords: todayStats?.todayLearnedWords || 0,
              todayLearnedGrammars: todayStats?.todayLearnedGrammars || 0,
              dueTotal: (todayStats?.dueWords || 0) + (todayStats?.dueGrammars || 0),
              // Android Calculation: learned + reviewed
              completedTotal: (todayStats?.todayLearnedWords || 0) + (todayStats?.todayLearnedGrammars || 0) + 
                             (todayStats?.todayReviewedWords || 0) + (todayStats?.todayReviewedGrammars || 0)
            }}
          />
        </section>

        {/* 3. 周进度 (Week View) */}
        <section className={calendarStyles.section}>
          <h2 className={calendarStyles.sectionTitle}>本周进度</h2>
          <CalendarWeekView 
            todayEpoch={todayEpoch}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </section>

        {/* 4. 详细记录 (Day Detail) */}
        <section className={calendarStyles.section}>
           <h2 className={calendarStyles.sectionTitle}>详细记录</h2>
           <CalendarDayDetail 
             date={selectedDate}
             data={detailedRecord || null}
             isLoading={detailedLoading}
           />
        </section>

        <footer className={calendarStyles.footer}>
          <p>持之以恒，见证成长</p>
        </footer>
      </div>
    </main>
  );
}
