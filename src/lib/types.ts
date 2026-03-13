export type OperationMode = 'addsub' | 'multdiv';
export type ProblemOrder = 'random' | 'standard';
export type OperandOrder = 'random' | 'standard' | 'reverse';
export type MissingValueMode = 'result' | 'operand' | 'random';
export type CustomSet = '10s' | 'doubles' | 'squares' | null;
export type SetsMode = 'cycles' | 'single';
export type StartMode = 'full' | 'min';

export interface ProblemSpec {
  a: number;
  b: number;
  sum: number;
  product: number;
}

export interface ProblemDisplay {
  left: number;
  right: number;
  result: number;
  missing: 'left' | 'right' | 'result';
  correct: number;
  // Timing / Stat tracking metrics
  presentedAtPerf?: number;
  firstAttemptMs?: number | null;
  completionMs?: number | null;
  attempts?: number;
}

export interface SessionOptions {
  operation: OperationMode;
  problemOrder: ProblemOrder;
  operandOrder: OperandOrder;
  missingValue: MissingValueMode;
  startMode: StartMode;
  setsMode: SetsMode;
  activeChips: number[]; // e.g. [1, 2, 3] usually 1-9
  customSet: CustomSet;
  practiceCycles: number;
}

export interface SessionStats {
  completed: number;
  correctFirst: number;
  missedFirst: number;
}

export interface MissedProblem {
  a: number;
  b: number;
  res: number;
  op: string; // '+' or '×'
  guesses: string[];
}
