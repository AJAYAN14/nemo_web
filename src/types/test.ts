export type QuestionSource = 'WRONG' | 'FAVORITE' | 'TODAY' | 'TODAY_REVIEWED' | 'LEARNED' | 'ALL';
export type TestContentType = 'WORDS' | 'GRAMMAR' | 'MIXED';

export enum WordLevel {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3',
  N2 = 'N2',
  N1 = 'N1'
}

export enum GrammarLevel {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3',
  N2 = 'N2',
  N1 = 'N1'
}

export enum TestMode {
  JP_TO_CN = 'JP_TO_CN', // Shows Japanese, options are Chinese
  CN_TO_JP = 'CN_TO_JP', // Shows Chinese, options are Japanese
  KANA = 'KANA',         // Shows Japanese, options are Hiragana
  EXAMPLE = 'EXAMPLE',   // Shows example sentence, options are words
  RANDOM = 'RANDOM'      // Randomly picks one of the modes above or POS
}

export enum QuestionDistribution {
  BALANCED = 'BALANCED',
  RANDOM = 'RANDOM',
  CUSTOM = 'CUSTOM'
}

export interface TestConfig {
  questionCount: number;
  timeLimitMinutes: number;
  questionSource: QuestionSource;
  wrongAnswerRemovalThreshold: number;
  testContentType: TestContentType;
  testMode: TestMode;
  selectedWordLevels: WordLevel[];
  selectedGrammarLevels: GrammarLevel[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  autoAdvance: boolean;
  prioritizeWrong: boolean;
  prioritizeNew: boolean;
  comprehensiveQuestionCounts: Record<string, number>;
  distribution?: QuestionDistribution;
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  questionCount: 20,
  timeLimitMinutes: 0,
  questionSource: 'ALL',
  wrongAnswerRemovalThreshold: 0,
  testContentType: 'WORDS',
  testMode: TestMode.JP_TO_CN,
  selectedWordLevels: [WordLevel.N5],
  selectedGrammarLevels: [GrammarLevel.N5],
  shuffleQuestions: true,
  shuffleOptions: true,
  autoAdvance: true,
  prioritizeWrong: false,
  prioritizeNew: true,
  comprehensiveQuestionCounts: {
    multiple_choice: 5,
    typing: 5,
    card_matching: 5,
    sorting: 5,
  },
  distribution: QuestionDistribution.BALANCED,
};

