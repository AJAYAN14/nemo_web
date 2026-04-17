import React, { useState } from 'react';
import clsx from 'clsx';
import { StudyConfig } from '@/types/study';
import { NemoButton } from '@/components/ui/NemoButton';
import { settingsService } from '@/lib/services/settingsService';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

// Standardize on settingsService for configuration management


export function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [learningStepsStr, setLearningStepsStr] = useState('');
  const [relearningStepsStr, setRelearningStepsStr] = useState('');
  const [learnAheadLimitStr, setLearnAheadLimitStr] = useState('');
  const [leechThresholdStr, setLeechThresholdStr] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  React.useEffect(() => {
    const init = async () => {
      const c = await settingsService.getStudyConfig();
      setConfig(c);
      setLearningStepsStr(c.learningSteps.join(' '));
      setRelearningStepsStr(c.relearningSteps.join(' '));
      setLearnAheadLimitStr(c.learnAheadLimit.toString());
      setLeechThresholdStr(c.leechThreshold.toString());
    };
    if (isOpen) init();
  }, [isOpen]);

  const handleSave = async () => {
    if (!config) return;
    // Parse steps strings back to arrays
    const parseSteps = (str: string) => str.split(/\s+/).map(s => parseInt(s)).filter(n => !isNaN(n));

    // Merge with current state
    const newConfig: Partial<StudyConfig> = { 
      isRandom: config.isRandom,
      leechAction: config.leechAction,
      resetHour: config.resetHour,
      learningSteps: parseSteps(learningStepsStr),
      relearningSteps: parseSteps(relearningStepsStr),
      learnAheadLimit: parseInt(learnAheadLimitStr) || 0,
      leechThreshold: parseInt(leechThresholdStr) || 5,
    };

    await settingsService.updateStudyConfig(newConfig);
    if (onSave) onSave();
    onClose();
  };

  if (!isOpen || !config) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>学习偏好设置</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.scrollArea}>

            <div 
              className={styles.checkboxContainer}
              onClick={() => setConfig({...config, isRandom: !config.isRandom})}
            >
              <div className={styles.checkboxLabel}>
                <strong>随机抽取新词</strong>
                <small>{config.isRandom ? '打破默认顺序' : '按序号顺序学习'}</small>
              </div>
              <div className={clsx(styles.gooeyToggle, config.isRandom && styles.gooeyToggleActive)}>
                <div className={styles.thumb} />
              </div>
            </div>

          <div className={styles.advancedHeader} onClick={() => setShowAdvanced(!showAdvanced)}>
            <h3 className={styles.sectionTitle}>高级记忆算法配置</h3>
            <span className={`${styles.arrow} ${showAdvanced ? styles.expanded : ''}`}>▼</span>
          </div>

          {showAdvanced && (
            <div className={styles.advancedSection}>
              <div className={styles.inputGroup}>
                <label>学习阶段步进 (分钟)</label>
                <input 
                  type="text" 
                  className={styles.textInput}
                  value={learningStepsStr}
                  onChange={(e) => setLearningStepsStr(e.target.value)}
                  placeholder="例如: 1 10"
                />
                <span className={styles.inputDesc}>输入用空格分隔的分钟数。第一步通常是由于错误，最后一步后进入正式复习。</span>
              </div>

              <div className={styles.inputGroup}>
                <label>复学阶段步进 (分钟)</label>
                <input 
                  type="text" 
                  className={styles.textInput}
                  value={relearningStepsStr}
                  onChange={(e) => setRelearningStepsStr(e.target.value)}
                  placeholder="例如: 10"
                />
              </div>

              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label>提前学习限值 (分钟)</label>
                    <input 
                      type="number" 
                      className={styles.textInput}
                      value={learnAheadLimitStr}
                      onChange={(e) => setLearnAheadLimitStr(e.target.value)}
                    />
                </div>
                <div className={styles.inputGroup}>
                  <label>Leech 错误阈值 (次)</label>
                    <input 
                      type="number" 
                      className={styles.textInput}
                      value={leechThresholdStr}
                      onChange={(e) => setLeechThresholdStr(e.target.value)}
                    />
                </div>
              </div>

                <div className={styles.inputGroup}>
                  <label>Leech 触发动作</label>
                  <select 
                    className={styles.selectInput}
                    value={config.leechAction || 'skip'}
                    onChange={(e) => setConfig({...config, leechAction: e.target.value as StudyConfig['leechAction']})}
                  >
                    <option value="skip">自动停载 (进入 Leech 管理)</option>
                    <option value="bury_today">今日暂缓 (次日恢复)</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>新的一天开始时间 (点)</label>
                  <select 
                    className={styles.selectInput}
                    value={config.resetHour ?? 4}
                    onChange={(e) => setConfig({...config, resetHour: parseInt(e.target.value)})}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{settingsService.formatResetHour(i)}</option>
                    ))}
                  </select>
                  <span className={styles.inputDesc}>此时间将作为统计热力图和每日复习量的结算点。建议设置为您的睡眠深度时间。</span>
                </div>
              </div>
            )}
          </div>

        <div className={styles.footer}>
          <NemoButton variant="secondary" onClick={onClose}>
            取消
          </NemoButton>
          <NemoButton onClick={handleSave}>
            保存设置
          </NemoButton>
        </div>
      </div>
    </div>
  );
}
