import React from "react";
import { Volume2 } from "lucide-react";
import styles from "./GrammarDetailHeader.module.css";
import { FuriganaText } from "@/components/common/FuriganaText";
import { Plus, Check, Loader2 } from "lucide-react";
import { studyService } from "@/lib/services/studyService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface GrammarDetailHeaderProps {
  id: number;
  title: string;
  level: string;
  isStudying?: boolean;
}

export function GrammarDetailHeader({ id, title, level, isStudying = false }: GrammarDetailHeaderProps) {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: () => studyService.addToLibrary("temp-user-id", "grammar", id), // TODO: Replace with real user ID
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grammar", id.toString()] });
    }
  });
  return (
    <div className={styles.container}>
      <div className={styles.mainInfo}>
        <div className={styles.title}>
          <FuriganaText text={title} />
        </div>
        <div className={styles.levelBadge}>
          {level}
        </div>
      </div>
      
      <div className={styles.actions}>
        <button 
          className={`${styles.studyButton} ${isStudying ? styles.active : ""}`}
          onClick={() => !isStudying && mutation.mutate()}
          disabled={isStudying || mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 size={20} className={styles.spin} />
          ) : isStudying ? (
            <Check size={20} />
          ) : (
            <Plus size={20} />
          )}
          <span>{isStudying ? "学习中" : "加入学习"}</span>
        </button>

        <button 
          className={styles.audioButton}
          onClick={() => alert("音频播放功能开发中...")}
          title="播放读音"
        >
          <Volume2 size={24} />
        </button>
      </div>
    </div>
  );
}
