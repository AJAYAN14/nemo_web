"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { 
  seionData, 
  dakuonData, 
  yoonData, 
  sokuonData, 
  chouonData, 
  KanaCell 
} from "@/lib/data/kanaData";
import styles from "./kana.module.css";

type KanaType = "hiragana" | "katakana";
type SectionKey = "seion" | "dakuon" | "yoon" | "sokuon" | "chouon";

export default function KanaChartPage() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<KanaType>("hiragana");
  const [activeSection, setActiveSection] = useState<SectionKey>("seion");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [flashSection, setFlashSection] = useState<SectionKey | null>(null);

  const sectionRefs = {
    seion: useRef<HTMLElement>(null),
    dakuon: useRef<HTMLElement>(null),
    yoon: useRef<HTMLElement>(null),
    sokuon: useRef<HTMLElement>(null),
    chouon: useRef<HTMLElement>(null),
  };

  const scrollToSection = (key: SectionKey) => {
    setActiveSection(key);
    sectionRefs[key].current?.scrollIntoView({ behavior: "smooth" });
    setFlashSection(key);
    setTimeout(() => setFlashSection(null), 1000);
  };

  const handleSpeak = (text: string, id: string) => {
    if (!window.speechSynthesis) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 1.0;

    setPlayingId(id);
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const getSpeakText = (cell: KanaCell) => {
    const text = activeType === "katakana" ? cell.katakana || cell.hiragana : cell.hiragana;
    // Android custom pronunciations for small tsu
    if (text.includes("っ") || text.includes("ッ")) {
      if (text.includes("+k")) return "がっこう";
      if (text.includes("+s")) return "かっさ";
      if (text.includes("+t")) return "きって";
      if (text.includes("+p")) return "かっぷ";
    }
    return text;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={22} />
          </button>
          <h1 className={styles.title}>五十音图</h1>
        </div>
      </header>

      {/* Sticky Controls */}
      <div className={styles.controlsWrapper}>
        <div className={styles.controlsInner}>
          <div className={styles.tabContainer}>
            <button 
              className={clsx(styles.pillTab, activeType === "hiragana" && styles.pillActive)}
              onClick={() => setActiveType("hiragana")}
            >
              平假名
            </button>
            <button 
              className={clsx(styles.pillTab, activeType === "katakana" && styles.pillActive)}
              onClick={() => setActiveType("katakana")}
            >
              片假名
            </button>
          </div>

          <div className={styles.quickNav}>
            {(["seion", "dakuon", "yoon", "sokuon", "chouon"] as SectionKey[]).map((key) => (
              <button
                key={key}
                className={clsx(styles.navChip, activeSection === key && styles.navChipActive)}
                onClick={() => scrollToSection(key)}
              >
                {SECTION_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className={styles.content}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={activeType} // Refresh animations when toggling script
        >
          {/* 1. 清音 */}
          <section className={clsx(styles.section, flashSection === "seion" && styles.flash)} ref={sectionRefs.seion}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIndicator} />
              <h2 className={styles.sectionTitle}>清音</h2>
            </div>
            <div className={clsx(styles.grid, styles.columns5)}>
              {seionData.map((cell, idx) => (
                <KanaCard 
                  key={`seion-${idx}`} 
                  cell={cell} 
                  activeType={activeType} 
                  isPlaying={playingId === `seion-${idx}`}
                  onSpeak={() => cell && handleSpeak(getSpeakText(cell), `seion-${idx}`)}
                />
              ))}
            </div>
          </section>

          {/* 2. 浊音 / 半浊音 */}
          <section className={clsx(styles.section, flashSection === "dakuon" && styles.flash)} ref={sectionRefs.dakuon}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIndicator} />
              <h2 className={styles.sectionTitle}>浊音 / 半浊音</h2>
            </div>
            <span className={styles.sectionSubtitle}>在假名右上角添加点或圆圈改变发音</span>
            <div className={clsx(styles.grid, styles.columns5)}>
              {dakuonData.map((cell, idx) => (
                <KanaCard 
                  key={`dakuon-${idx}`} 
                  cell={cell} 
                  activeType={activeType} 
                  isPlaying={playingId === `dakuon-${idx}`}
                  onSpeak={() => cell && handleSpeak(getSpeakText(cell), `dakuon-${idx}`)}
                />
              ))}
            </div>
          </section>

          {/* 3. 拗音 */}
          <section className={clsx(styles.section, flashSection === "yoon" && styles.flash)} ref={sectionRefs.yoon}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIndicator} />
              <h2 className={styles.sectionTitle}>拗音</h2>
            </div>
            <span className={styles.sectionSubtitle}>“い”段假名与小写的“や、ゆ、よ”组合</span>
            <div className={clsx(styles.grid, styles.columns3)}>
              {yoonData.map((cell, idx) => (
                <KanaCard 
                  key={`yoon-${idx}`} 
                  cell={cell} 
                  activeType={activeType} 
                  isPlaying={playingId === `yoon-${idx}`}
                  onSpeak={() => cell && handleSpeak(getSpeakText(cell), `yoon-${idx}`)}
                />
              ))}
            </div>
          </section>

          {/* 4. 促音 */}
          <section className={clsx(styles.section, flashSection === "sokuon" && styles.flash)} ref={sectionRefs.sokuon}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIndicator} />
              <h2 className={styles.sectionTitle}>促音</h2>
            </div>
            <span className={styles.sectionSubtitle}>表示一个短促的停顿，发音与其后的声母有关</span>
            <div className={clsx(styles.grid, styles.columns4)}>
              {sokuonData.map((cell, idx) => (
                <KanaCard 
                  key={`sokuon-${idx}`} 
                  cell={cell} 
                  activeType={activeType} 
                  isPlaying={playingId === `sokuon-${idx}`}
                  onSpeak={() => cell && handleSpeak(getSpeakText(cell), `sokuon-${idx}`)}
                />
              ))}
            </div>
          </section>

          {/* 5. 长音 */}
          <section className={clsx(styles.section, flashSection === "chouon" && styles.flash)} ref={sectionRefs.chouon}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIndicator} />
              <h2 className={styles.sectionTitle}>长音</h2>
            </div>
            <div className={clsx(styles.grid, styles.columns5)}>
              {chouonData.map((cell, idx) => (
                <KanaCard 
                  key={`chouon-${idx}`} 
                  cell={cell} 
                  activeType={activeType} 
                  isPlaying={playingId === `chouon-${idx}`}
                  onSpeak={() => cell && handleSpeak(getSpeakText(cell), `chouon-${idx}`)}
                />
              ))}
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

function KanaCard({ 
  cell, 
  activeType, 
  isPlaying, 
  onSpeak 
}: { 
  cell: KanaCell | null; 
  activeType: KanaType; 
  isPlaying: boolean;
  onSpeak: () => void;
}) {
  if (!cell) return <div />;
  
  const displayKana = activeType === "katakana" ? (cell.katakana || cell.hiragana) : cell.hiragana;
  const isSmallTsu = displayKana.includes("っ") || displayKana.includes("ッ");
  
  return (
    <motion.div 
      className={clsx(styles.card, isPlaying && styles.cardPlaying)}
      onClick={onSpeak}
      whileTap={{ scale: 0.94 }}
    >
      <span className={clsx(styles.kanaMajor, isSmallTsu && styles.kanaMajorSmall)}>
        {displayKana.split('+')[0]}
      </span>
      <span className={styles.romaji}>{cell.romaji}</span>
    </motion.div>
  );
}

const SECTION_LABELS: Record<SectionKey, string> = {
  seion: "清音",
  dakuon: "浊音/半浊音",
  yoon: "拗音",
  sokuon: "促音",
  chouon: "长音"
};
