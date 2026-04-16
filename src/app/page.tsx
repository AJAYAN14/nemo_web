"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Library,
  Languages,
  Trophy,
  Grid3X3
} from "lucide-react";
import styles from "./page.module.css";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { ModernCircularProgress } from "@/components/ui/ModernCircularProgress";
import { statisticsService } from "@/lib/services/statisticsService";
import { settingsService } from "@/lib/services/settingsService";
import { StudyConfig } from "@/types/study";
import { SakuraLoader } from "@/components/common/SakuraLoader";
import { ClayCard } from "@/components/clay/ClayCard";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function Home() {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mode, setMode] = useState<'word' | 'grammar'>(() => {
    if (typeof window === 'undefined') return 'word';
    const stored = localStorage.getItem('nemo_study_settings');
    if (!stored) return 'word';
    try {
      const config: StudyConfig = JSON.parse(stored);
      return config.mode === 'GRAMMAR_ONLY' ? 'grammar' : 'word';
    } catch { return 'word'; }
  });

  const [wordLevel, setWordLevel] = useState<string>(() => {
    if (typeof window === 'undefined') return 'N5';
    const stored = localStorage.getItem('nemo_study_settings');
    if (!stored) return 'N5';
    try {
      const config: any = JSON.parse(stored);
      return config.wordLevel || config.level || 'N5';
    } catch { return 'N5'; }
  });

  const [grammarLevel, setGrammarLevel] = useState<string>(() => {
    if (typeof window === 'undefined') return 'N5';
    const stored = localStorage.getItem('nemo_study_settings');
    if (!stored) return 'N5';
    try {
      const config: any = JSON.parse(stored);
      return config.grammarLevel || config.level || 'N5';
    } catch { return 'N5'; }
  });

  const [isLevelPopoverOpen, setIsLevelPopoverOpen] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 5 ? "夜深了" :
                         hour < 9 ? "早上好" :
                         hour < 12 ? "上午好" :
                         hour < 14 ? "中午好" :
                         hour < 19 ? "下午好" : "晚上好";
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

  const { data: dashboardData, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ["dashboard-data", user?.id],
    queryFn: async () => {
      const config = await settingsService.getStudyConfig();
      const stats = await statisticsService.getTodayStats(user!.id, config.resetHour || 4);
      return { stats };
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const handleLevelSelect = (lv: string) => {
    if (mode === 'word') setWordLevel(lv);
    else setGrammarLevel(lv);
    setIsLevelPopoverOpen(false);
  };

  const persistSettings = (m: 'word' | 'grammar', wl: string, gl: string) => {
    localStorage.setItem('nemo_study_settings', JSON.stringify({
      mode: m === 'word' ? 'WORDS_ONLY' : 'GRAMMAR_ONLY',
      wordLevel: wl,
      grammarLevel: gl,
    }));
  };

  useEffect(() => {
    persistSettings(mode, wordLevel, grammarLevel);
  }, [mode, wordLevel, grammarLevel]);

  useEffect(() => {
    if (user) refetch();
  }, [user, refetch]);

  useEffect(() => {
    const refreshStats = () => { if (user) void refetch(); };
    const handleVisibility = () => { if (document.visibilityState === 'visible') refreshStats(); };
    window.addEventListener('focus', refreshStats);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refreshStats);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, refetch]);

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
  }, [user, userLoading, router]);

  if (userLoading || dataLoading) {
    return (
      <div className={styles.loadingScreen}>
        <SakuraLoader />
        <p className={styles.loadingText}>正在同步学习进度...</p>
      </div>
    );
  }

  if (!user || !dashboardData) return null;

  const { stats } = dashboardData;
  const isWordMode = mode === 'word';
  const selectedLevel = isWordMode ? wordLevel : grammarLevel;
  const currentProgress = isWordMode ? stats.todayLearnedWords : stats.todayLearnedGrammars;
  const dailyGoal = isWordMode ? stats.dailyGoal : stats.grammarDailyGoal;
  const progressPercent = isWordMode ? stats.wordGoalProgress : stats.grammarGoalProgress;
  const reviewedToday = isWordMode ? stats.todayReviewedWords : stats.todayReviewedGrammars;
  const itemsDue = isWordMode ? stats.dueWords : stats.dueGrammars;
  
  const hasActiveSession = itemsDue > 0;

  return (
    <motion.main 
      className={clsx(styles.container, styles.hasBottomPadding)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 🚀 Immersive Dashboard Header */}
      <motion.header className={styles.header} variants={itemVariants}>
        <div className={styles.headerText}>
          <p className={styles.dateText}>{currentDate}</p>
          <h1 className={styles.greeting}>{greeting}，{user.email?.split('@')[0] || 'Nemo'}</h1>
        </div>
        <div className={styles.avatar}>
           {user.email?.[0].toUpperCase()}
        </div>
      </motion.header>

      {/* 🛠️ Dynamic Controls */}
      <motion.section className={styles.controlsBar} variants={itemVariants}>
        <button 
          className={styles.levelPill}
          onClick={() => setIsLevelPopoverOpen(!isLevelPopoverOpen)}
        >
          <span className={isWordMode ? styles.labelWord : styles.labelGrammar}>JLPT {selectedLevel}</span>
          <ChevronRight size={14} className={clsx(styles.levelChevron, isLevelPopoverOpen && styles.levelChevronOpen)} />
          
          {isLevelPopoverOpen && (
            <div className={styles.levelPopover} onClick={(e) => e.stopPropagation()}>
              {['N5', 'N4', 'N3', 'N2', 'N1'].map((lv) => (
                <div 
                  key={lv}
                  className={clsx(styles.levelOption, selectedLevel === lv && styles.levelOptionActive)}
                  onClick={() => handleLevelSelect(lv)}
                >
                  {lv}
                </div>
              ))}
            </div>
          )}
        </button>

        <div className={styles.modeSwitch}>
          <button 
            className={clsx(isWordMode && styles.modeActiveWord)} 
            onClick={() => setMode('word')}
          >
            单词
          </button>
          <button 
            className={clsx(!isWordMode && styles.modeActiveGrammar)} 
            onClick={() => setMode('grammar')}
          >
            语法
          </button>
        </div>
      </motion.section>

      {/* 📊 Central Progress Card */}
      <motion.section variants={itemVariants}>
        <ClayCard className={styles.heroCard} padding="large">
          <p className={styles.heroLabel}>今日新学进度</p>
          <div className={styles.ringWrapper}>
            <ModernCircularProgress
              value={progressPercent}
              size={140}
              color={isWordMode ? 'var(--primary-color)' : '#10B981'}
            >
              <span className={styles.ringValue}>{currentProgress}</span>
            </ModernCircularProgress>
          </div>
          <p className={styles.heroGoalText}>新学目标 {dailyGoal}</p>
        </ClayCard>
      </motion.section>

      {/* ⚡ Primary Action & Secondary Context */}
      <motion.section className={styles.actionArea} variants={itemVariants}>
        <button 
          className={clsx(styles.mainActionBtn, isWordMode ? styles.bgWord : styles.bgGrammar)}
          onClick={() => router.push(`/learn?type=${mode === 'word' ? 'word' : 'grammar'}`)}
        >
          {hasActiveSession ? "继续学习" : "开始学习"}
          <ArrowRight size={20} />
        </button>

        <div className={styles.secondaryStats}>
          <ClayCard padding="none" interactive onClick={() => router.push('/review/prep')}>
            <div className={styles.miniStatCard}>
              <span className={styles.miniStatLabel}>今日复习</span>
              <span className={styles.miniStatValue}>{reviewedToday}</span>
            </div>
          </ClayCard>
          <ClayCard padding="none">
            <div className={styles.miniStatCard}>
              <span className={styles.miniStatLabel}>待复习</span>
              <span className={styles.miniStatValue}>{itemsDue}</span>
            </div>
          </ClayCard>
        </div>
      </motion.section>

      {/* 📚 Resource Menu */}
      <motion.h2 className={styles.sectionTitle} variants={itemVariants}>学习资源</motion.h2>
      <motion.section className={styles.resourceList} variants={itemVariants}>
        <div className={styles.resourceItem} onClick={() => router.push('/heatmap')}>
          <div className={styles.resIcon} style={{ backgroundColor: '#FAF5FF' }}>
            <Trophy size={24} color="#8B5CF6" />
          </div>
          <div className={styles.resInfo}>
            <span className={styles.resTitle}>学习热力图</span>
            <span className={styles.resSubtitle}>年度回顾与数据高光</span>
          </div>
          <ChevronRight size={18} className={styles.resArrow} />
        </div>

        <div className={styles.resourceItem} onClick={() => router.push('/library')}>
          <div className={styles.resIcon} style={{ backgroundColor: '#EEF2FF' }}>
            <Library size={24} color="#4F46E5" />
          </div>
          <div className={styles.resInfo}>
            <span className={styles.resTitle}>词库浏览</span>
            <span className={styles.resSubtitle}>管理已学词汇与收藏</span>
          </div>
          <ChevronRight size={18} className={styles.resArrow} />
        </div>

        <div className={styles.resourceItem} onClick={() => router.push('/grammar')}>
          <div className={styles.resIcon} style={{ backgroundColor: '#F0FDF4' }}>
            <Languages size={24} color="#10B981" />
          </div>
          <div className={styles.resInfo}>
            <span className={styles.resTitle}>语法点</span>
            <span className={styles.resSubtitle}>常用结构深度解析</span>
          </div>
          <ChevronRight size={18} className={styles.resArrow} />
        </div>
        <div className={styles.resourceItem} onClick={() => router.push('/library/kana')}>
          <div className={styles.resIcon} style={{ backgroundColor: '#FFF1F2' }}>
            <Grid3X3 size={24} color="#F43F5E" />
          </div>
          <div className={styles.resInfo}>
            <span className={styles.resTitle}>五十音图</span>
            <span className={styles.resSubtitle}>基础假名发音与书写</span>
          </div>
          <ChevronRight size={18} className={styles.resArrow} />
        </div>
      </motion.section>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </motion.main>
  );
}
