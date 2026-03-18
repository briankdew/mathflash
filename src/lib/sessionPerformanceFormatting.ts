import {
  SessionInputMode,
  SessionPerformanceReport,
  SessionProblemPerformance,
} from './types';

export function formatMetric(value: number | null, suffix = ' ms') {
  if (value === null) return 'N/A';
  return `${Math.round(value)}${suffix}`;
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

