import React, { useEffect, useRef } from 'react';

interface ModernCircularProgressProps {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  gapRatio?: number; // 相对于线宽的倍数，默认1.5
  animationDuration?: number; // ms
  children?: React.ReactNode;
}

/**
 * 现代环形进度条，带动态缺口，支持 Material/Apple Fitness 风格
 */
export const ModernCircularProgress: React.FC<ModernCircularProgressProps> = ({
  value,
  size = 120,
  strokeWidth = 12,
  color = '#00eaff',
  trackColor = '#e5e7eb',
  gapRatio = 1.5,
  animationDuration = 800,
  children,
}) => {
  // 动画：用ref保存当前动画进度
  const animatedValue = useRef(value);
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let start: number | null = null;
    const from = animatedValue.current;
    const to = value;
    const duration = animationDuration;
    if (from === to) return;
    function animate(ts: number) {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      animatedValue.current = from + (to - from) * eased;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(animate);
      if (t < 1) {
        // 触发重渲染
        setRerender((v) => v + 1);
      } else {
        animatedValue.current = to;
        setRerender((v) => v + 1);
      }
    }
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [value, animationDuration]);

  // 强制重渲染
  const [, setRerender] = React.useState(0);

  // 计算参数
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const gapLength = strokeWidth * gapRatio;
  // 进度百分比（0-1）
  const percent = Math.max(0, Math.min(1, animatedValue.current / 100));
  // 动态缺口长度
  const dynamicGap = percent === 0 ? gapLength * 0.7 : gapLength;
  // 彩色进度条长度
  const progressLength = percent === 0 ? 0.0001 : (circumference - dynamicGap) * percent;
  // 底轨长度
  const trackLength = percent === 1 ? 0.0001 : (circumference - dynamicGap) * (1 - percent);
  // 头部留白角度
  const gapAngle = (dynamicGap / circumference) * 360;
  // 进度条起始角度（-90deg顶部）
  const startAngle = -90 + gapAngle / 2;

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto', position: 'relative' }}>
      {/* 底轨 */}
      {trackLength > 0.001 && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${trackLength} ${circumference}`}
          strokeDashoffset={
            -((circumference - dynamicGap) * percent) - dynamicGap / 2
          }
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.2s, stroke-dashoffset 0.2s' }}
        />
      )}
      {/* 彩色进度条 */}
      {progressLength > 0.001 && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progressLength} ${circumference}`}
          strokeDashoffset={-dynamicGap / 2}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.2s, stroke-dashoffset 0.2s' }}
        />
      )}
      {/* 居中内容 */}
      {children && (
        <foreignObject x={strokeWidth} y={strokeWidth} width={size - strokeWidth * 2} height={size - strokeWidth * 2}>
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: size * 0.22,
            color: '#222',
            userSelect: 'none',
          }}>
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
};
