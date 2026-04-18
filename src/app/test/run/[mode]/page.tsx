'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { testService, TestQuestion } from '@/lib/services/testService';
import { TestConfig, DEFAULT_TEST_CONFIG } from '@/types/test';
import styles from './TestRun.module.css';

import { UnifiedTestScreen } from '@/components/test/run/UnifiedTestScreen';
import { TestHeader } from '@/components/test/run/TestHeader';
import { TestFooter } from '@/components/test/run/TestFooter';
import { MultipleChoiceTestContent } from '@/components/test/run/MultipleChoiceTestContent';
import { TypingTestContent } from '@/components/test/run/TypingTestContent';
import { SortingTestContent } from '@/components/test/run/SortingTestContent';
import { CardMatchingTestContent } from '@/components/test/run/CardMatchingTestContent';

export default function TestRunPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = params.mode as string; // 'multiple_choice' or 'typing' or 'mixed'

  // State
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selected: string, isCorrect: boolean, requeued?: boolean }>>({});
  const [status, setStatus] = useState<'loading' | 'intro' | 'active' | 'summary'>('loading');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [config, setConfig] = useState<TestConfig>(DEFAULT_TEST_CONFIG);
  
  // Keep track of navigation direction for animation
  const [direction, setDirection] = useState(1);
  const [typingInput, setTypingInput] = useState('');
  const [sortingInput, setSortingInput] = useState<{id: string, char: string}[]>([]);

  // Load Config & Generate Queue
  useEffect(() => {
    async function init() {
      try {
        const configStr = searchParams.get('config');
        const loadedConfig: TestConfig = configStr ? JSON.parse(configStr) : DEFAULT_TEST_CONFIG;
        setConfig(loadedConfig);
        
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // If mode specifically requests typing, sorting, or card_matching, pass it as override
        const overrideType = mode === 'typing' ? 'typing' 
          : (mode === 'sorting' ? 'sorting' 
          : (mode === 'card_matching' ? 'card_matching'
          : (mode === 'multiple_choice' ? 'multiple_choice'
          : (mode === 'comprehensive' ? 'comprehensive' : undefined))));
        const queue = await testService.generateTestQueue(user.id, loadedConfig, overrideType);
        
        setQuestions(queue);
        
        if (config.timeLimitMinutes > 0) {
          setTimeLeft(config.timeLimitMinutes * 60);
        }
        
        setStatus('intro');
      } catch (err) {
        console.error('Failed to init test:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [searchParams, mode]);

  if (loading) return <div className={styles.loading}>加载测试中...</div>;

  if (questions.length === 0 && status !== 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.introCard}>
          <div className={styles.introIcon}>⚠️</div>
          <h1>未找到题目</h1>
          <p>当前选择的来源或等级下没有符合条件的题目。</p>
          <button className={styles.primaryButton} onClick={() => router.back()}>
            返回修改
          </button>
        </div>
      </div>
    );
  }

  // Timer Logic
  useEffect(() => {
    if (status === 'active' && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === 1) {
            setStatus('summary');
            return 0;
          }
          return (prev || 0) - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, timeLeft]);

  // Reset typing and sorting input when changing questions
  useEffect(() => {
    const currentQ = questions[currentIndex];
    if (currentQ) {
      const savedAnswer = answers[currentQ.id];
      if (currentQ.questionType === 'sorting') {
        try {
          const parsed = savedAnswer ? JSON.parse(savedAnswer.selected) as {id: string, char: string}[] : [];
          setSortingInput(parsed);
        } catch {
          setSortingInput([]);
        }
        setTypingInput('');
      } else {
        setTypingInput(savedAnswer ? savedAnswer.selected : '');
        setSortingInput([]);
      }
    }
  }, [currentIndex, questions, answers]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const isAnswered = !!currentAnswer;

  // Auto advance and requeue effect
  useEffect(() => {
    if (isAnswered && currentAnswer !== undefined) {
      // Re-queue logic on wrong answer
      if (!currentAnswer.isCorrect && config.wrongAnswerRemovalThreshold > 0 && !currentAnswer.requeued) {
        setQuestions(prev => {
          const newQs = [...prev];
          for (let i = 0; i < config.wrongAnswerRemovalThreshold; i++) {
            newQs.push({
              ...currentQuestion,
              id: `${currentQuestion.id}_retry_${Date.now()}_${i}`
            });
          }
          return newQs;
        });
        
        // Mark as requeued to prevent infinite loops within the same render sequence
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: { ...currentAnswer, requeued: true }
        }));
      }

      if (config.autoAdvance && (currentAnswer.isCorrect || currentAnswer.requeued)) {
        const timer = setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
          } else {
            setStatus('summary');
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isAnswered, currentAnswer, config.autoAdvance, config.wrongAnswerRemovalThreshold, currentIndex, questions.length, currentQuestion]);

  const handleOptionSelect = (selected: string) => {
    if (!currentQuestion || isAnswered || currentQuestion.questionType !== 'multiple_choice') return;

    const isCorrect = selected === currentQuestion.correctAnswer;
    setAnswers(prev => ({ 
      ...prev, 
      [currentQuestion.id]: { selected, isCorrect } 
    }));
  };

  const handleTypingSubmit = () => {
    if (!currentQuestion || isAnswered || currentQuestion.questionType !== 'typing') return;
    
    if (!typingInput || typingInput.trim() === '') return;

    const isCorrect = typingInput.trim() === currentQuestion.correctAnswer;
    setAnswers(prev => ({ 
      ...prev, 
      [currentQuestion.id]: { selected: typingInput.trim(), isCorrect } 
    }));
  };

  const handleSortingSubmit = () => {
    if (!currentQuestion || isAnswered || currentQuestion.questionType !== 'sorting') return;
    
    if (sortingInput.length === 0) return;

    const constructedAnswer = sortingInput.map(char => char.char).join('');
    const isCorrect = constructedAnswer === currentQuestion.correctAnswer;
    setAnswers(prev => ({ 
      ...prev, 
      [currentQuestion.id]: { selected: JSON.stringify(sortingInput), isCorrect } 
    }));
  };

  const handleCardMatchingComplete = () => {
    if (!currentQuestion || isAnswered || currentQuestion.questionType !== 'card_matching') return;
    
    setAnswers(prev => ({ 
      ...prev, 
      [currentQuestion.id]: { selected: 'matched', isCorrect: true } 
    }));
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1));
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const stats = useMemo(() => {
    const list = Object.values(answers);
    const correct = list.filter(a => a.isCorrect).length;
    return {
      total: questions.length,
      correct,
      wrong: list.length - correct,
      score: list.length > 0 ? Math.round((correct / list.length) * 100) : 0
    };
  }, [answers, questions]);

  if (status === 'intro') {
    const modeName = mode === 'multiple_choice' ? '选择题' : (mode === 'typing' ? '手打题' : (mode === 'sorting' ? '排序题' : (mode === 'card_matching' ? '卡片配对' : mode)));
    return (
      <div className={styles.container}>
        <div className={styles.introCard}>
          <div className={styles.introIcon}>🚀</div>
          <h1>准备好了吗？</h1>
          <p>模式: {modeName}</p>
          <p>共 {questions.length} 道题目已就绪</p>
          <button className={styles.primaryButton} onClick={() => setStatus('active')}>
            开启挑战
          </button>
        </div>
      </div>
    );
  }

  if (status === 'summary') {
    return (
      <div className={styles.container}>
        <div className={styles.summaryCard}>
          <div className={styles.scoreCircle}>
            <span className={styles.scoreNumber}>{stats.score}</span>
            <span className={styles.scoreLabel}>得分</span>
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{stats.correct}</span>
              <span className={styles.summaryLabel}>正确</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{stats.wrong}</span>
              <span className={styles.summaryLabel}>错误</span>
            </div>
          </div>
          <p className={styles.practiceNote}>* 本次测试完成</p>
          <div className={styles.summaryActions}>
            <button className={styles.primaryButton} onClick={() => router.back()}>
              结束
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isTyping = currentQuestion?.questionType === 'typing';
  const isSorting = currentQuestion?.questionType === 'sorting';
  const isCardMatching = currentQuestion?.questionType === 'card_matching';
  
  const getSubmitHandler = () => {
    if (isTyping) return handleTypingSubmit;
    if (isSorting) return handleSortingSubmit;
    return () => {};
  };

  const checkCanSubmit = () => {
    if (isTyping) return typingInput.trim().length > 0;
    if (isSorting) return sortingInput.length > 0;
    if (isCardMatching) return false; // Handled internally
    return false;
  };

  return (
    <UnifiedTestScreen
      headerContent={
        <TestHeader 
          onBack={() => router.back()}
          timeLimitSeconds={0}
          timeRemainingSeconds={timeLeft}
          currentIndex={currentIndex}
          totalQuestions={questions.length}
        />
      }
      testContent={
        currentQuestion ? (
          isCardMatching ? (
            <CardMatchingTestContent
              question={currentQuestion}
              isAnswered={isAnswered}
              onComplete={handleCardMatchingComplete}
              direction={direction}
              autoAdvance={() => setTimeout(handleNext, 1500)}
            />
          ) : isSorting ? (
            <SortingTestContent
              question={currentQuestion}
              userAnswer={sortingInput}
              isAnswered={isAnswered}
              onAnswerChange={setSortingInput}
              direction={direction}
            />
          ) : isTyping ? (
            <TypingTestContent
              question={currentQuestion}
              userInput={typingInput}
              isAnswered={isAnswered}
              onInputChange={setTypingInput}
              direction={direction}
            />
          ) : (
            <MultipleChoiceTestContent 
              question={currentQuestion}
              selectedOption={currentAnswer?.selected || null}
              isAnswered={isAnswered}
              onOptionSelect={handleOptionSelect}
              direction={direction}
            />
          )
        ) : <div />
      }
      footerContent={
        <TestFooter 
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmit={getSubmitHandler()} 
          onFinish={() => setStatus('summary')}
          canGoPrev={currentIndex > 0}
          canSubmit={checkCanSubmit()} 
          isAnswered={isAnswered}
          isLastQuestion={currentIndex === questions.length - 1}
          submitText={isTyping || isSorting ? "检查" : "提交"}
          isAutoAdvancing={isCardMatching}
        />
      }
    />
  );
}

