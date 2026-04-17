import React, { useEffect, useRef, useState } from 'react';

interface ModernCircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  gapRatio?: number;
  animationDuration?: number;
  children?: React.ReactNode;
}

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
  const [displayValue, setDisplayValue] = useState(value);
  const valueRef = useRef(value);

  useEffect(() => {
    let rafId: number | undefined;
    let start: number | null = null;
    const from = valueRef.current;
    const to = value;

    if (from === to) {
      valueRef.current = to;
      return;
    }

    const animate = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(1, elapsed / animationDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;

      valueRef.current = next;
      setDisplayValue(next);

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        valueRef.current = to;
        setDisplayValue(to);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, [value, animationDuration]);

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const gapLength = strokeWidth * gapRatio;
  const percent = Math.max(0, Math.min(1, displayValue / 100));
  const dynamicGap = percent === 0 ? gapLength * 0.7 : gapLength;
  const progressLength = percent === 0 ? 0.0001 : (circumference - dynamicGap) * percent;
  const trackLength = percent === 1 ? 0.0001 : (circumference - dynamicGap) * (1 - percent);

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto', position: 'relative' }}>
      {trackLength > 0.001 && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${trackLength} ${circumference}`}
          strokeDashoffset={-((circumference - dynamicGap) * percent) - dynamicGap / 2}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.2s, stroke-dashoffset 0.2s' }}
        />
      )}

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

      {children && (
        <foreignObject x={strokeWidth} y={strokeWidth} width={size - strokeWidth * 2} height={size - strokeWidth * 2}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: size * 0.22,
              color: '#222',
              userSelect: 'none',
            }}
          >
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
};
