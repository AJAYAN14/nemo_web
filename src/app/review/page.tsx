"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { studyService } from "@/lib/services/studyService";
import { settingsService } from "@/lib/services/settingsService";
import { ReviewSession } from "./ReviewSession";
import { NemoButton } from "@/components/ui/NemoButton";
import { Sparkles } from "lucide-react";

/**
 * Review Page — data loader that fetches due review items
 * then renders ReviewSession component.
 *
 * Matches Android ReviewScreen.kt → ReviewSessionScreen.kt flow.
 */
export default function ReviewPage() {
  const router = useRouter();

  // 1. Auth
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // 2. Fetch all due review items (both words + grammars, mixed)
  const { data: reviewData, isLoading: dataLoading, isFetching } = useQuery({
    queryKey: ["review-session-items", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not found");

      const studyConfig = await settingsService.getStudyConfig();

      // Fetch all due items (words + grammars mixed)
      const allDue = await studyService.getDueItems(user.id, undefined, undefined, studyConfig.resetHour || 4);

      // For review mode: only items that have actually been reviewed before.
      const reviewItems = allDue.filter(item => item.progress.reps > 0 && !!item.progress.last_review);

      // Global mixed sort by next_review (ascending) — matches Android ReviewViewModel
      reviewItems.sort((a, b) => {
        const aTime = a.progress.next_review ? new Date(a.progress.next_review).getTime() : 0;
        const bTime = b.progress.next_review ? new Date(b.progress.next_review).getTime() : 0;
        if (aTime !== bTime) return aTime - bTime;
        return Number(a.id) - Number(b.id); // Stable sort
      });

      console.log(`[ReviewPage] Loaded ${reviewItems.length} review items (Words: ${reviewItems.filter(i => i.type === 'word').length}, Grammars: ${reviewItems.filter(i => i.type === 'grammar').length})`);

      return { items: reviewItems, config: studyConfig };
    },
    enabled: !!user && !userLoading,
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // 3. Loading
  if (userLoading || dataLoading || isFetching) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        color: '#6B7280',
        background: '#F9FAFB'
      }}>
        <Sparkles size={32} color="#4F46E5" style={{ animation: 'spin 1s linear infinite' }} />
        <p>正在加载复习内容...</p>
      </div>
    );
  }

  if (!user) return null;

  const items = reviewData?.items || [];
  const config = reviewData?.config;

  // 4. Empty state
  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        background: '#F9FAFB',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>🎉</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          复习完成！
        </h2>
        <p style={{ color: '#6B7280', maxWidth: '300px' }}>
          目前没有需要复习的内容。可以去学习新词，或者明天再来复习！
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <NemoButton onClick={() => router.push('/learn')} variant="secondary">
            去学习
          </NemoButton>
          <NemoButton onClick={() => router.push('/')}>
            回首页
          </NemoButton>
        </div>
      </div>
    );
  }

  // 5. Render review session
  return (
    <ReviewSession
      userId={user.id}
      initialItems={items}
      config={config!}
    />
  );
}
