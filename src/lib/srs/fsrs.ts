/**
 * FSRS 6 (Free Spaced Repetition Scheduler) implementation for Nemo2 Web.
 * Ported from: Android Nemo FsrsAlgorithm.kt
 */

export enum FsrsRating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4
}

export interface MemoryState {
  stability: number;
  difficulty: number;
}

export interface ItemState {
  memory: MemoryState;
  interval: number;
}

export interface NextStates {
  again: ItemState;
  hard: ItemState;
  good: ItemState;
  easy: ItemState;
}

// FSRS 6 Default Parameters (21 parameters)
export const DEFAULT_PARAMETERS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542
];

const S_MIN = 0.01;
const S_MAX = 36500;
const D_MIN = 1;
const D_MAX = 10;
const MAX_INTERVAL = 36500;

export class FsrsAlgorithm {
  private w: number[];
  private targetRetention: number;

  constructor(parameters: number[] = DEFAULT_PARAMETERS, targetRetention: number = 0.9) {
    this.w = [...parameters];
    this.targetRetention = targetRetention;
  }

  public setParameters(parameters: number[]) {
    if (parameters.length !== 21) {
      console.warn(
        `[FSRS] setParameters: expected 21 parameters, got ${parameters.length}. ` +
        'Keeping current parameters to prevent NaN propagation.'
      );
      return;
    }
    this.w = [...parameters];
  }

  public getParameters(): number[] {
    return [...this.w];
  }

  // --- Core Formulas ---

  private forgettingCurve(elapsedDays: number, stability: number): number {
    const decay = this.w[20];
    const factor = Math.pow(0.9, 1 / -decay) - 1;
    return Math.pow((elapsedDays / stability) * factor + 1, -decay);
  }

  private nextInterval(stability: number, retention: number = this.targetRetention): number {
    const decay = this.w[20];
    const factor = Math.pow(0.9, 1 / -decay) - 1;
    return (stability / factor) * (Math.pow(retention, 1 / -decay) - 1);
  }

  private initStability(rating: FsrsRating): number {
    return Math.max(S_MIN, Math.min(S_MAX, this.w[rating - 1]));
  }

  private initDifficulty(rating: FsrsRating): number {
    const d = this.w[4] - Math.exp(this.w[5] * (rating - 1)) + 1;
    return Math.max(D_MIN, Math.min(D_MAX, d));
  }

  private nextDifficulty(difficulty: number, rating: FsrsRating): number {
    const deltaD = -this.w[6] * (rating - 3);
    const linearDamped = (deltaD * (10 - difficulty)) / 9;
    const newD = difficulty + linearDamped;

    // Mean reversion
    const d0Good = this.w[4] - Math.exp(this.w[5] * (3)) + 1; // Good is rating 3 (zero-indexed 2 offset in formula)
    const reverted = this.w[7] * (d0Good - newD) + newD;

    return Math.max(D_MIN, Math.min(D_MAX, reverted));
  }

  private stabilityAfterSuccess(
    stability: number,
    difficulty: number,
    retrievability: number,
    rating: FsrsRating
  ): number {
    const hardPenalty = rating === FsrsRating.Hard ? this.w[15] : 1.0;
    const easyBonus = rating === FsrsRating.Easy ? this.w[16] : 1.0;

    const newS = stability * (
      Math.exp(this.w[8]) *
      (11 - difficulty) *
      Math.pow(stability, -this.w[9]) *
      (Math.exp((1 - retrievability) * this.w[10]) - 1) *
      hardPenalty *
      easyBonus + 1
    );
    return Math.max(S_MIN, Math.min(S_MAX, newS));
  }

  private stabilityAfterFailure(
    stability: number,
    difficulty: number,
    retrievability: number
  ): number {
    const newS = this.w[11] *
      Math.pow(difficulty, -this.w[12]) *
      (Math.pow(stability + 1, this.w[13]) - 1) *
      Math.exp((1 - retrievability) * this.w[14]);

    const minS = stability / Math.exp(this.w[17] * this.w[18]);
    return Math.max(S_MIN, Math.min(S_MAX, Math.max(newS, minS)));
  }

  private stabilityShortTerm(stability: number, rating: FsrsRating): number {
    const sinc = Math.exp(this.w[17] * (rating - 3 + this.w[18])) * Math.pow(stability, -this.w[19]);
    const clampedSinc = rating >= 2 ? Math.max(sinc, 1) : sinc;
    return Math.max(S_MIN, Math.min(S_MAX, stability * clampedSinc));
  }

  // --- High Level API ---

  public step(
    currentState: MemoryState | null,
    rating: FsrsRating,
    elapsedDays: number
  ): MemoryState {
    if (!currentState || currentState.stability === 0) {
      return {
        stability: this.initStability(rating),
        difficulty: this.initDifficulty(rating)
      };
    }

    const s = Math.max(S_MIN, Math.min(S_MAX, currentState.stability));
    const d = Math.max(D_MIN, Math.min(D_MAX, currentState.difficulty));

    let newS: number;
    if (elapsedDays === 0) {
      newS = this.stabilityShortTerm(s, rating);
    } else {
      const r = this.forgettingCurve(elapsedDays, s);
      if (rating === FsrsRating.Again) {
        newS = this.stabilityAfterFailure(s, d, r);
      } else {
        newS = this.stabilityAfterSuccess(s, d, r, rating);
      }
    }

    const newD = this.nextDifficulty(d, rating);

    return {
      stability: Math.max(S_MIN, Math.min(S_MAX, newS)),
      difficulty: Math.max(D_MIN, Math.min(D_MAX, newD))
    };
  }

  public nextIntervalDays(stability: number): number {
    const raw = this.nextInterval(stability);
    return Math.max(1, Math.min(MAX_INTERVAL, Math.round(raw)));
  }

  /**
   * Determinstic Fuzz to prevent review pileups.
   * Matches Android's fuzzing strategy for FSRS 6.
   */
  public nextIntervalDaysWithFuzz(stability: number, seed: number): number {
    const baseInterval = this.nextIntervalDays(stability);
    if (baseInterval < 3) return baseInterval;

    let span = 1;
    if (baseInterval < 7) span = 1;
    else if (baseInterval < 30) span = Math.max(1, Math.round(baseInterval * 0.08));
    else if (baseInterval < 90) span = Math.max(2, Math.round(baseInterval * 0.12));
    else span = Math.max(4, Math.round(baseInterval * 0.15));

    // Improved LCG-based deterministic pseudo-random
    // Uses a variation of Park-Miller for better distribution
    const salt = (baseInterval * 1103515245 + 12345) & 0x7fffffff;
    const finalSeed = (seed ^ salt) >>> 0;
    
    // High-quality deterministic random using a simple LCG
    const nextRandom = (finalSeed * 1664525 + 1013904223) >>> 0;
    const pseudoRandom = nextRandom % (span * 2 + 1);
    const delta = pseudoRandom - span;
    
    return Math.max(1, Math.min(MAX_INTERVAL, baseInterval + delta));
  }
}
