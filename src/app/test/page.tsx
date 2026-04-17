"use client";

import React from "react";
import { 
  Star, 
  AlertCircle, 
  Trophy, 
  Gamepad2, 
  GraduationCap,
  ChevronRight,
  BookMarked
} from "lucide-react";
import styles from "./test.module.css";

interface TestCardProps {
  icon: React.ReactElement<{ size?: number; strokeWidth?: number }>;
  color: string;
  title: string;
  count: string;
  subtitle: string;
}

interface TestListItemProps {
  icon: React.ReactElement<{ size?: number }>;
  color: string;
  title: string;
  subtitle: string;
}

export default function TestPage() {
  return (
    <main className={styles.container}>
      {/* Immersive Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>测试</h1>
      </header>

      {/* 1. Collections & Review lists */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>收藏与错题</h2>
        <div className={styles.grid}>
          <TestCard 
            icon={<Star />} 
            color="#fbbf24" 
            title="我的收藏" 
            count="128" 
            subtitle="已收藏的单词与句子"
          />
          <TestCard 
            icon={<AlertCircle />} 
            color="#ef4444" 
            title="错题本" 
            count="45" 
            subtitle="重点攻克薄弱环节"
          />
        </div>
      </section>

      {/* 2. Challenge & Test Modes */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>挑战与考核</h2>
        <div className={styles.listCard}>
          <TestListItem 
            icon={<GraduationCap />} 
            color="#8b5cf6" 
            title="JLPT 模拟测试" 
            subtitle="全真模拟考试环境" 
          />
          <TestListItem 
            icon={<Gamepad2 />} 
            color="#06b6d4" 
            title="词汇消消乐" 
            subtitle="寓教于乐的趣味练习" 
          />
          <TestListItem 
            icon={<Trophy />} 
            color="#f97316" 
            title="速度挑战" 
            subtitle="挑战你的反应极限" 
          />
          <TestListItem 
            icon={<BookMarked />} 
            color="#10b981" 
            title="完形填空" 
            subtitle="深度考察语法运用" 
          />
        </div>
      </section>
    </main>
  );
}

function TestCard({ icon, color, title, count, subtitle }: TestCardProps) {
  return (
    <div className={styles.testCard}>
      <div className={styles.cardIcon} style={{ color }}>
        {React.cloneElement(icon, { size: 32, strokeWidth: 2.5 })}
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardTop}>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.cardCount}>{count}</span>
        </div>
        <p className={styles.cardSubtitle}>{subtitle}</p>
      </div>
    </div>
  );
}

function TestListItem({ icon, color, title, subtitle }: TestListItemProps) {
  return (
    <div className={styles.listItem}>
      <div className={styles.listIcon} style={{ background: `${color}15`, color: color }}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <div className={styles.listText}>
        <span className={styles.listTitle}>{title}</span>
        <span className={styles.listSubtitle}>{subtitle}</span>
      </div>
      <ChevronRight size={16} className={styles.arrow} />
    </div>
  );
}
