import { OperationMode, ProblemDisplay } from './types';

export interface VoiceAnswerRange {
  min: number;
  max: number;
}

export type VoiceNormalizationFailureReason =
  | 'empty'
  | 'ambiguous'
  | 'out_of_range';

export type VoiceNormalizationResult =
  | {
      kind: 'valid';
      normalizedText: string;
      numericValue: number;
    }
  | {
      kind: 'invalid';
      reason: VoiceNormalizationFailureReason;
    };

const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const VALID_WORDS = new Set([
  ...Object.keys(ONES),
  ...Object.keys(TEENS),
  ...Object.keys(TENS),
]);

function parseNumberWords(cleaned: string): number | null {
  const words = cleaned.replace(/-/g, ' ').split(' ').filter(Boolean);

  if (words.length === 0 || words.length > 2) {
    return null;
  }

  if (words.some(word => !VALID_WORDS.has(word))) {
    return null;
  }

  if (words.length === 1) {
    if (ONES[words[0]] !== undefined) return ONES[words[0]];
    if (TEENS[words[0]] !== undefined) return TEENS[words[0]];
    if (TENS[words[0]] !== undefined) return TENS[words[0]];
    return null;
  }

  const [first, second] = words;
  if (TENS[first] === undefined || ONES[second] === undefined || ONES[second] === 0) {
    return null;
  }

  return TENS[first] + ONES[second];
}

export function numberToWords(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    return String(value);
  }

  const onesEntry = Object.entries(ONES).find(([, num]) => num === value);
  if (onesEntry) return onesEntry[0];

  const teenEntry = Object.entries(TEENS).find(([, num]) => num === value);
  if (teenEntry) return teenEntry[0];

  const tensEntry = Object.entries(TENS).find(([, num]) => num === value);
  if (tensEntry) return tensEntry[0];

  const tensValue = Math.floor(value / 10) * 10;
  const onesValue = value % 10;
  const tensWord = Object.entries(TENS).find(([, num]) => num === tensValue)?.[0];
  const onesWord = Object.entries(ONES).find(([, num]) => num === onesValue)?.[0];

  if (!tensWord || !onesWord) {
    return String(value);
  }

  return `${tensWord}-${onesWord}`;
}

export function buildVoiceContextualStrings(range: VoiceAnswerRange): string[] {
  const values = new Set<string>();

  for (let value = range.min; value <= range.max; value += 1) {
    values.add(String(value));
    values.add(numberToWords(value));
    values.add(numberToWords(value).replace(/-/g, ' '));
  }

  return Array.from(values);
}

export function getVoiceAnswerRange(
  currentProblem: ProblemDisplay | null,
  operation: OperationMode
): VoiceAnswerRange {
  if (!currentProblem) {
    return operation === 'addsub' ? { min: 0, max: 18 } : { min: 0, max: 81 };
  }

  if (currentProblem.missing === 'left' || currentProblem.missing === 'right') {
    return { min: 1, max: 9 };
  }

  return operation === 'addsub' ? { min: 2, max: 18 } : { min: 1, max: 81 };
}

export function normalizeVoiceNumber(
  rawTranscript: string,
  range: VoiceAnswerRange
): VoiceNormalizationResult {
  const cleaned = rawTranscript
    .toLowerCase()
    .replace(/[.,!?/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return { kind: 'invalid', reason: 'empty' };
  }

  if (/^-/.test(cleaned) || /\b(minus|negative|point|decimal)\b/.test(cleaned)) {
    return { kind: 'invalid', reason: 'ambiguous' };
  }

  let numericValue: number | null = null;

  if (/^\d+$/.test(cleaned)) {
    numericValue = Number.parseInt(cleaned, 10);
  } else {
    numericValue = parseNumberWords(cleaned);
  }

  if (!Number.isFinite(numericValue)) {
    return { kind: 'invalid', reason: 'ambiguous' };
  }

  if (numericValue === null || numericValue < range.min || numericValue > range.max) {
    return { kind: 'invalid', reason: 'out_of_range' };
  }

  return {
    kind: 'valid',
    normalizedText: String(numericValue),
    numericValue,
  };
}
