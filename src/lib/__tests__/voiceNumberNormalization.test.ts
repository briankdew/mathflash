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

describe('near-miss words', () => {
  const range = { min: 0, max: 99 };
  const value = (text: string) => {
    const result = normalizeVoiceNumber(text, range);
    return result.kind === 'valid' ? result.normalizedText : null;
  };

  it('maps common mishearings to the number', () => {
    expect(value('sex')).toBe('6');
    expect(value('Sicks')).toBe('6');
    expect(value('or')).toBe('4');
    expect(value('for')).toBe('4');
    expect(value('to')).toBe('2');
    expect(value('too')).toBe('2');
    expect(value('tree')).toBe('3');
    expect(value('free')).toBe('3');
    expect(value('ate')).toBe('8');
    expect(value('nein')).toBe('9');
    expect(value('won')).toBe('1');
    expect(value('oh')).toBe('0');
  });

  it('joins split teens and fixes the second word of a compound', () => {
    expect(value('for teen')).toBe('14');
    expect(value('six teen')).toBe('16');
    expect(value('fif teen')).toBe('15');
    expect(value('thir teen')).toBe('13');
    expect(value('twenty for')).toBe('24');
    expect(value('thirty to')).toBe('32');
  });

  it('still rejects things that are not numbers', () => {
    expect(value('hello')).toBeNull();
    expect(value('for sale')).toBeNull();
    expect(value('teen')).toBeNull();
  });

  it('treats a mishearing like its number when holding an interim', () => {
    expect(couldGrowIntoLongerNumber('for', { min: 2, max: 18 })).toBe(true);
    expect(couldGrowIntoLongerNumber('to', { min: 1, max: 81 })).toBe(false);
  });
});
