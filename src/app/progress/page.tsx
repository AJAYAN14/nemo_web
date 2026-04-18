"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  RotateCcw,
  BarChart3,
  Calendar,
  Book,
  Activity,
  PieChart,
  LineChart,
  TrendingUp,
  Database,
  Wand2,
  LayoutList,
  Grid3X3,
  ArrowRight
} from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { statisticsService } from "@/lib/services/statisticsService";
import { settingsService } from "@/lib/services/settingsService";
import { SakuraLoader } from "@/components/common/SakuraLoader";
import styles from "./progress.module.css";

interface DashboardStats {
  progress: number;
  masteredCount: number;
  totalWords: number;
  todayLearned: number;
  dailyGoal: number;
  unmasteredCount: number;
  studyStreak: number;
  dueCount: number;
  totalStudyDays: number;
  weekStudyDays: number;
}

interface SummaryPage {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  main: { label: string; value: number; unit: string };
  topRight: { label: string; value: number; unit: string };
  bottomRight: { label: string; value: number; unit: string };
  visualType: "progress" | "dots" | "bars";
  progressValue?: number;
}

interface ProgressItemProps {
  icon: React.ReactElement<{ size?: number }>;
  color: string;
  title: string;
  subtitle: string;
  count?: number;
  onClick: () => void;
}

export default function ProgressPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 5 ? "夜深了" :
                         hour < 12 ? "早上好" :
                         hour < 18 ? "下午好" : "晚上好";
    setGreeting(timeGreeting);

    const formatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });
    setCurrentDate(formatter.format(new Date()));
  }, []);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ["progress-summary", user?.id],
    queryFn: async () => {
      const config = await settingsService.getStudyConfig();
      return await statisticsService.getDashboardSummary(user!.id, config.resetHour || 4);
    },
    enabled: !!user,
  });

  const loading = userLoading || dataLoading;

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <SakuraLoader />
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className={styles.mainContainer}>
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div className={styles.headerGroup}>
            <h1 className={styles.greeting}>
              你的成长全景，{user?.user_metadata?.full_name || user?.email?.split('@')[0] || '同学'}
            </h1>
            <p className={styles.date}>{currentDate}</p>
          </div>
        </header>

      <section className={styles.carouselContainer}>
        <LearningSummaryCarousel data={data} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>复习与训练</h2>
        <div className={styles.listCard}>
          <ProgressItem
            icon={<RotateCcw />}
            color="#4F46E5"
            title="今日到期复习"
            subtitle="核心复习任务"
            onClick={() => router.push("/review")}
          />
          <ProgressItem
            icon={<Activity />}
            color="#10B981"
            title="专项训练"
            subtitle="按主题强化练习"
            onClick={() => router.push("/library/specialized?source=practice")}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>数据与资料</h2>
        <div className={styles.listCard}>
          <ProgressItem
            icon={<PieChart />}
            color="#6366f1"
            title="学习日历"
            subtitle="学习计划与每日记录"
            onClick={() => router.push("/progress/calendar")}
          />
          <ProgressItem
            icon={<LineChart />}
            color="#f43f5e"
            title="今日统计"
            subtitle="查看今日学习明细"
            onClick={() => router.push("/statistics/today")}
          />
          <ProgressItem
            icon={<BarChart3 />}
            color="#8b5cf6"
            title="历史统计"
            subtitle="查看历史学习数据"
            onClick={() => router.push("/statistics/history")}
          />
          <ProgressItem
            icon={<LayoutList />}
            color="#10B981"
            title="单词列表"
            subtitle="词汇库管理"
            onClick={() => router.push("/library?tab=words")}
          />
          <ProgressItem
            icon={<Database />}
            color="#0ea5e9"
            title="专项词汇"
            subtitle="按分类查看词汇"
            onClick={() => router.push("/library/specialized?source=vocabulary")}
          />
          <ProgressItem
            icon={<Book />}
            color="#6366f1"
            title="语法列表"
            subtitle="语法知识库"
            onClick={() => router.push("/library?tab=grammars")}
          />
          <ProgressItem
            icon={<Wand2 />}
            color="#f59e0b"
            title="复学清单"
            subtitle="难点项召回与复习"
            onClick={() => router.push("/review/leech")}
          />
          <ProgressItem
            icon={<Grid3X3 />}
            color="#f43f5e"
            title="五十音图"
            subtitle="基础假名发音参考"
            onClick={() => router.push("/library/kana")}
          />
        </div>
      </section>
      </div>
    </main>
  );
}

function LearningSummaryCarousel({ data }: { data: DashboardStats }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const safeGoal = data.dailyGoal > 0 ? data.dailyGoal : 1;
  const completionRate = Math.min(100, Math.round((data.todayLearned / safeGoal) * 100));

  const pages: SummaryPage[] = [
    {
      id: "overview",
      title: "今日概览",
      icon: <Calendar size={52} />,
      color: "linear-gradient(135deg, #6366f1, #4f46e5)",
      main: { label: "今日已学", value: data.todayLearned, unit: "项" },
      topRight: { label: "待复习", value: data.dueCount, unit: "项" },
      bottomRight: { label: "目标完成", value: completionRate, unit: "%" },
      visualType: "progress",
      progressValue: Math.min(1, data.todayLearned / safeGoal)
    },
    {
      id: "track",
      title: "学习轨迹",
      icon: <Activity size={52} />,
      color: "linear-gradient(135deg, #10b981, #059669)",
      main: { label: "连续学习", value: data.studyStreak, unit: "天" },
      topRight: { label: "累计掌握", value: data.masteredCount, unit: "项" },
      bottomRight: { label: "待学习", value: data.unmasteredCount, unit: "项" },
      visualType: "dots"
    },
    {
      id: "growth",
      title: "成长总览",
      icon: <TrendingUp size={52} />,
      color: "linear-gradient(135deg, #f59e0b, #d97706)",
      main: { label: "总进度", value: Math.round(data.progress * 100), unit: "%" },
      topRight: { label: "累计学习", value: data.totalStudyDays, unit: "天" },
      bottomRight: { label: "本周学习", value: data.weekStudyDays, unit: "天" },
      visualType: "bars"
    }
  ];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % pages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, pages.length]);

  return (
    <div
      className={styles.carouselWrapper}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.carouselViewport}>
        <motion.div
          className={styles.carouselTrack}
          animate={{ x: `-${index * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, { offset }) => {
            if (offset.x < -50 && index < pages.length - 1) setIndex(index + 1);
            if (offset.x > 50 && index > 0) setIndex(index - 1);
          }}
        >
          {pages.map((page) => (
            <div key={page.id} className={styles.carouselSlide}>
              <SummaryCard page={page} />
            </div>
          ))}
        </motion.div>
      </div>

      <div className={styles.indicators}>
        {pages.map((page, i) => (
          <div
            key={page.id}
            className={clsx(styles.indicator, i === index && styles.indicatorActive)}
            style={{ backgroundColor: i === index ? page.color : undefined }}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ page }: { page: SummaryPage }) {
  return (
    <div className={styles.bentoGrid}>
      <div className={styles.mainTile} style={{ background: page.color }}>
        <div className={styles.decoIcon}>{page.icon}</div>
        <div className={styles.mainTileContent}>
          <VisualHint type={page.visualType} progress={page.progressValue} />
          <span className={styles.tileLabel}>{page.title}</span>
          <div className={styles.statValueRow}>
            <span className={styles.mainValue}>{page.main.value}</span>
            <span className={styles.mainUnit}>{page.main.unit}</span>
          </div>
        </div>
      </div>

      <div className={styles.sideTiles}>
        <div className={styles.subTile}>
          <span className={styles.tileLabel}>{page.topRight.label}</span>
          <div className={styles.statValueRow}>
            <span className={styles.subValue}>{page.topRight.value}</span>
            <span className={styles.subUnit}>{page.topRight.unit}</span>
          </div>
        </div>
        <div className={styles.subTile}>
          <span className={styles.tileLabel}>{page.bottomRight.label}</span>
          <div className={styles.statValueRow}>
            <span className={styles.subValue}>{page.bottomRight.value}</span>
            <span className={styles.subUnit}>{page.bottomRight.unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualHint({ type, progress }: { type: SummaryPage["visualType"]; progress?: number }) {
  if (type === "progress") {
    return (
      <div className={styles.visualHint}>
        <div className={styles.progressBar}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${(progress || 0) * 100}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>
    );
  }

  if (type === "dots") {
    return (
      <div className={styles.visualHint}>
        <div className={styles.dotsRow}>
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={clsx(styles.dot, i < 5 && styles.dotActive)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.visualHint}>
      <div className={styles.barsRow}>
        {[8, 12, 16, 10].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: h }}
            transition={{ delay: i * 0.1, type: "spring" }}
            className={clsx(styles.bar, i === 2 && styles.barActive)}
          />
        ))}
      </div>
    </div>
  );
}

function ProgressItem({ icon, color, title, subtitle, count, onClick }: ProgressItemProps) {
  return (
    <div className={styles.item} onClick={onClick}>
      <div className={styles.iconWrapper} style={{ backgroundColor: `${color}15`, color }}>
        {React.cloneElement(icon, { size: 22 })}
      </div>
      <div className={styles.itemText}>
        <div className={styles.itemTop}>
          <span className={styles.itemTitle}>{title}</span>
          {typeof count === "number" && <span className={styles.itemCount}>{count}</span>}
        </div>
        <span className={styles.itemSubtitle}>{subtitle}</span>
      </div>
      <ChevronRight size={14} className={styles.arrow} />
    </div>
  );
}

