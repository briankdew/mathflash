import {
  couldGrowIntoLongerNumber,
  buildVoiceContextualStrings,
  getVoiceAcceptedAnswerRange,
  getVoiceAnswerRange,
  normalizeVoiceNumber,
  numberToWords,
} from '../voiceNumberNormalization';
import { ProblemDisplay } from '../types';

const operandProblem: ProblemDisplay = {
  left: 3,
  right: 4,
  result: 12,
  missing: 'left',
  correct: 3,
};

describe('voiceNumberNormalization', () => {
  it('normalizes spoken and numeric answers inside range', () => {
    expect(normalizeVoiceNumber('twenty-one', { min: 0, max: 30 })).toEqual({
      kind: 'valid',
      normalizedText: '21',
      numericValue: 21,
    });
    expect(normalizeVoiceNumber('08', { min: 0, max: 10 })).toEqual({
      kind: 'valid',
      normalizedText: '8',
      numericValue: 8,
    });
  });

  it('rejects ambiguous and out-of-range values', () => {
    expect(normalizeVoiceNumber('negative three', { min: 0, max: 10 })).toEqual({
      kind: 'invalid',
      reason: 'ambiguous',
    });
    expect(normalizeVoiceNumber('ninety nine', { min: 0, max: 20 })).toEqual({
      kind: 'invalid',
      reason: 'out_of_range',
    });
  });

  it('builds expected voice ranges and contextual strings', () => {
    expect(getVoiceAnswerRange(operandProblem, 'addsub')).toEqual({ min: 1, max: 9 });
    expect(getVoiceAcceptedAnswerRange(operandProblem, 'addsub')).toEqual({
      min: 0,
      max: 99,
    });
    expect(numberToWords(42)).toBe('forty-two');
    expect(buildVoiceContextualStrings({ min: 20, max: 21 })).toEqual([
      '20',
      'twenty',
      '21',
      'twenty-one',
      'twenty one',
    ]);
  });
});

describe('couldGrowIntoLongerNumber', () => {
  const addsub = { min: 2, max: 18 };
  const multdiv = { min: 1, max: 81 };

  it('holds numbers that may become a longer valid answer', () => {
    expect(couldGrowIntoLongerNumber('four', addsub)).toBe(true);
    expect(couldGrowIntoLongerNumber('Seven', addsub)).toBe(true);
    expect(couldGrowIntoLongerNumber('twenty', multdiv)).toBe(true);
    expect(couldGrowIntoLongerNumber('nine', multdiv)).toBe(true);
  });

  it('does not hold numbers that cannot grow within the range', () => {
    expect(couldGrowIntoLongerNumber('nine', addsub)).toBe(false);
    expect(couldGrowIntoLongerNumber('two', multdiv)).toBe(false);
    expect(couldGrowIntoLongerNumber('fifteen', addsub)).toBe(false);
    expect(couldGrowIntoLongerNumber('15', addsub)).toBe(false);
    expect(couldGrowIntoLongerNumber('four', { min: 1, max: 9 })).toBe(false);
  });
});
