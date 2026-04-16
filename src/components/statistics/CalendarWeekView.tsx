"use client";

import React, { useMemo } from 'react';
import styles from './CalendarWeekView.module.css';
import clsx from 'clsx';

interface DayItem {
  date: number; // epoch day
  label: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
}

interface CalendarWeekViewProps {
  todayEpoch: number;
  selectedDate: number;
  onSelectDate: (date: number) => void;
  isLoading?: boolean;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function CalendarWeekView({ 
  todayEpoch,
  selectedDate, 
  onSelectDate,
  isLoading 
}: CalendarWeekViewProps) {
  
  const days: DayItem[] = useMemo(() => {
    const result: DayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const epoch = todayEpoch + i;
      const dateObj = new Date(epoch * 86400000);
      result.push({
        date: epoch,
        label: WEEKDAY_LABELS[dateObj.getDay()],
        dayNumber: dateObj.getDate(),
        isToday: i === 0,
        isSelected: epoch === selectedDate
      });
    }
    return result;
  }, [todayEpoch, selectedDate]);

  const selectedDateText = useMemo(() => {
    const d = new Date(selectedDate * 86400000);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const isToday = selectedDate === todayEpoch;
    return `${isToday ? '今天 · ' : ''}${month}月${day}日`;
  }, [selectedDate, todayEpoch]);

  if (isLoading) {
    return <div className={clsx(styles.card, styles.skeleton)} />;
  }

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => onSelectDate(day.date)}
            className={clsx(
              styles.dayItem,
              day.isSelected && styles.selected,
              day.isToday && styles.today
            )}
          >
            <span className={styles.dayLabel}>{day.label}</span>
            <span className={styles.dayNumber}>{day.dayNumber}</span>
          </button>
        ))}
      </div>

      <div className={styles.indicatorWrapper}>
        <div className={styles.dateIndicator}>
          {selectedDateText}
        </div>
      </div>
    </div>
  );
}
