import {
  SessionInputMode,
  SessionPerformanceReport,
  SessionProblemPerformance,
} from './types';

// Times are stored in milliseconds and shown in seconds to 0.1: finer than that
// is not meaningful for a spoken or typed response.
export function formatMetric(value: number | null, suffix = ' s') {
  if (value === null) return 'N/A';
  return `${(value / 1000).toFixed(1)}${suffix}`;
}

export function formatPercent(value: number | null) {
  if (value === null) return 'N/A';
  return `${value}%`;
}

export function formatProblem(problem: SessionProblemPerformance) {
  const left = problem.missing === 'left' ? '□' : String(problem.left);
  const right = problem.missing === 'right' ? '□' : String(problem.right);
  const result = problem.missing === 'result' ? '□' : String(problem.result);
  const operator = problem.operation === 'addsub' ? '+' : '×';
  return `${left} ${operator} ${right} = ${result}`;
}

export function formatDistribution(distribution: Record<string, number>) {
  const entries = Object.entries(distribution).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  if (entries.length === 0) return 'No completed attempts';

  return entries.map(([attempts, count]) => `${attempts}x: ${count}`).join('   ');
}

export function modeLabel(mode: SessionInputMode) {
  return mode === 'voice' ? 'Voice' : 'Keypad';
}

export function onsetSourceSummary(report: SessionPerformanceReport) {
  return report.inputMode === 'voice'
    ? 'Response start is measured from problem display to first speech detected.'
    : 'Response start is measured from problem display to first digit entered.';
}

