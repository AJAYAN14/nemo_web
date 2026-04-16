'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import styles from './LearningSecondary.module.css';

interface LearningFinishedContentProps {
  title?: string;
  subtitle?: string;
}

const QUOTES = [
  "“温故而知新，可以为师矣。”",
  "“书山有路勤为径，学海无涯苦作舟。”",
  "“不积跬步，无以至千里。”",
  "“千里之行，始于足下。”"
];

export const LearningFinishedContent: React.FC<LearningFinishedContentProps> = ({
  title = "今日目标达成！",
  subtitle = "坚持就是胜利，明天继续加油"
}) => {
  // 随机选一条语录，或者根据当前日期选
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <div className={styles.container}>
      <div className={styles.heroIcon}>
        <div className={styles.heroIconInner}>
          <Check className={styles.checkIcon} />
        </div>
      </div>

      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.quoteCard}>
        <div className={styles.quoteText}>{quote}</div>
      </div>

      <Link href="/" className={styles.learnAheadBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        回到首页
      </Link>
    </div>
  );
};
