import { SessionPhase } from './types';

export function isSessionPhaseActive(phase: SessionPhase): boolean {
  return phase !== 'idle';
}

export function isSessionPhasePreparing(phase: SessionPhase): boolean {
  return phase === 'preparing';
}

export function isSessionPhaseRevealingProblem(phase: SessionPhase): boolean {
  return phase === 'revealingProblem';
}
