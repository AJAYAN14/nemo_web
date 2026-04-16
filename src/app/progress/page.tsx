"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  RotateCcw,
  BarChart3,
  Calendar,
  Book,
  Library,
  History,
  Flame,
  Zap,
  TrendingUp,
  Target,
  Activity,
  PieChart,
  LineChart,
  LayoutDashboard,
  Database,
  Wand2,
  Search,
  CheckCircle2,
  Clock,
  LayoutList,
  Grid3X3
} from "lucide-react";
import clsx from "clsx";
import styles from "./progress.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { statisticsService } from "@/lib/services/statisticsService";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// Dashboard metrics type
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

// Data model moved to component for better encapsulation

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth");
          return;
        }
        const stats = await statisticsService.getDashboardSummary(user.id);
        setData(stats);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={40} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className={styles.container}>
      {/* Immersive Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>进度</h1>
      </header>

      {/* 1. Learning Summary Carousel */}
      <section className={styles.carouselContainer}>
        <LearningSummaryCarousel data={data} />
      </section>

      {/* 2. Review & Training Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>复习与训练</h2>
        <div className={styles.listCard}>
          <ProgressItem
            icon={<RotateCcw />}
            color="#4F46E5"
            title="今日到期复习"
            subtitle="核心复习任务"
            count={data.dueCount}
            onClick={() => router.push("/review")}
          />
          <ProgressItem
            icon={<RotateCcw />}
            color="#10B981"
            title="专项训练"
            subtitle="针对性强化练习"
            onClick={() => router.push("/library/specialized?source=practice")}
          />
        </div>
      </section>

      {/* 3. Data & Resources Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>数据与资料</h2>
        <div className={styles.listCard}>
          <ProgressItem
            icon={<PieChart />}
            color="#4F46E5"
            title="学习日历"
            subtitle="查看学习计划与记录"
            onClick={() => router.push("/progress/calendar")}
          />
          <ProgressItem
            icon={<LineChart />}
            color="#ef4444"
            title="今日统计"
            subtitle="查看今日详细的学习统计"
            onClick={() => router.push('/statistics/today')}
          />
          <ProgressItem
            icon={<BarChart3 />}
            color="#af52de"
            title="历史统计"
            subtitle="查看所有详细的学习统计"
            onClick={() => router.push('/statistics/history')}
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
            color="#4F46E5"
            title="专项词汇"
            subtitle="按分类查看词汇"
            onClick={() => router.push("/library/specialized?source=vocabulary")}
          />
          <ProgressItem
            icon={<Book />}
            color="#4F46E5"
            title="语法列表"
            subtitle="语法知识库"
            onClick={() => router.push("/library?tab=grammars")}
          />
          <ProgressItem
            icon={<Wand2 />}
            color="#ef4444"
            title="复学清单"
            subtitle="难点项召回与复习"
            onClick={() => router.push("/review/leech")}
          />
          <ProgressItem
            icon={<Grid3X3 />}
            color="#F43F5E"
            title="五十音图"
            subtitle="基础假名发音参考"
            onClick={() => router.push("/library/kana")}
          />
        </div>
      </section>
    </main>
  );
}

/**
 * Learning Summary Carousel (Android Parity)
 * Features: Drag/Swipe support, Pause on Hover, Dynamic Indicators
 */
function LearningSummaryCarousel({ data }: { data: DashboardStats }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const pages = [
    {
      id: "overview",
      title: "日间概览",
      icon: <Calendar size={52} />,
      color: "#4F46E5",
      main: { label: "今日已学", value: data.todayLearned, unit: "个" },
      topRight: { label: "待复习", value: data.dueCount, unit: "词" },
      bottomRight: { label: "目标完成度", value: Math.round((data.todayLearned / data.dailyGoal) * 100), unit: "%" },
      visualType: "progress",
      progressValue: data.todayLearned / data.dailyGoal
    },
    {
      id: "track",
      title: "学习轨迹",
      icon: <Activity size={52} />,
      color: "#10B981",
      main: { label: "连续学习", value: data.studyStreak, unit: "天" },
      topRight: { label: "累计掌握", value: data.masteredCount, unit: "词" },
      bottomRight: { label: "待学习", value: data.unmasteredCount, unit: "词" },
      visualType: "dots"
    },
    {
      id: "growth",
      title: "成长总览",
      icon: <TrendingUp size={52} />,
      color: "#F4B73F",
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
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = offset.x;
            if (swipe < -50 && index < pages.length - 1) {
              setIndex(index + 1);
            } else if (swipe > 50 && index > 0) {
              setIndex(index - 1);
            }
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

function SummaryCard({ page }: { page: any }) {
  return (
    <div className={styles.bentoGrid}>
      {/* Main Tile: 1.45 Ratio */}
      <div className={styles.mainTile} style={{ backgroundColor: page.color }}>
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

      {/* Side Tiles: 1.0 Ratio Column */}
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

function VisualHint({ type, progress }: { type: string, progress?: number }) {
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
  if (type === "bars") {
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
  return null;
}

function ProgressItem({ icon, color, title, subtitle, count, onClick }: any) {
  return (
    <div className={styles.item} onClick={onClick}>
      <div className={styles.iconWrapper} style={{ backgroundColor: `${color}15`, color: color }}>
        {React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: 22 })}
      </div>
      <div className={styles.itemText}>
        <div className={styles.itemTop}>
          <span className={styles.itemTitle}>{title}</span>
          {count !== undefined && <span className={styles.itemCount}>{count}</span>}
        </div>
        <span className={styles.itemSubtitle}>{subtitle}</span>
      </div>
      <ChevronRight size={14} className={styles.arrow} />
    </div>
  );
}
