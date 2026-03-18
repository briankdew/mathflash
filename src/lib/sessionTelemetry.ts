import {
    SessionPerformanceReport,
    SessionInputMode,
    SessionOptions,
    SessionStats,
    VoiceSessionMetrics,
} from './types';

export type TelemetryPayload = Record<string, string>;

interface BuildSessionLogPayloadArgs {
    options: SessionOptions;
    sessionId: string;
    sessionStart: Date | null;
    stats: SessionStats;
    totalProblems: number;
    useTimer: boolean;
    sessionCompletionMsTotal: number;
    inputMode: SessionInputMode;
    voiceMetrics: VoiceSessionMetrics;
    sessionPerformanceReport: SessionPerformanceReport | null;
}

export function buildSessionLogPayload({
    options,
    sessionId,
    sessionStart,
    stats,
    totalProblems,
    useTimer,
    sessionCompletionMsTotal,
    inputMode,
    voiceMetrics,
    sessionPerformanceReport,
}: BuildSessionLogPayloadArgs): TelemetryPayload {
    const performanceSummary = sessionPerformanceReport?.summary ?? null;
    const performanceProblems = sessionPerformanceReport?.problems ?? [];
    const completed = stats.completed;
    const correctFirst = stats.correctFirst;
    const speed =
        completed > 0
            ? (sessionCompletionMsTotal / 1000 / completed).toFixed(1)
            : '0.0';

    const operationText =
        options.operation === 'addsub'
            ? 'Addition / Subtraction'
            : 'Multiplication / Division';

    let levelText = 'Easy';
    if (options.missingValue === 'operand') {
        levelText = 'Moderate';
    } else if (options.missingValue === 'random') {
        levelText = 'Difficult';
    }

    return {
        'Log Timestamp': new Date().toLocaleString(),
        'Session ID': sessionId,
        'User': '',
        'Timer on': useTimer ? 'Y' : 'N',
        'Operation': operationText,
        'Level': levelText,
        'Session reset': completed < totalProblems ? 'Y' : 'N',
        'Session date': sessionStart?.toLocaleDateString('en-US') || '',
        // Note: Full formatting should match index.html for backend compatibility
        'Problems selected': Math.round(
            totalProblems / Math.max(1, options.practiceCycles)
        ).toString(),
        'Practice cycles': options.practiceCycles.toString(),
        'Total problems': totalProblems.toString(),
        'Problems completed': completed.toString(),
        'Percent completed (%)':
            totalProblems > 0
                ? (100 * (completed / totalProblems)).toFixed(0)
                : '0',
        'Correct (first try)': correctFirst.toString(),
        'Missed (first try)': stats.missedFirst.toString(),
        'Accuracy (%)':
            completed > 0 ? (100 * (correctFirst / completed)).toFixed(0) : '0',
        'Calculation speed (sec/prob)': useTimer ? speed : '',
        'Input mode': inputMode,
        'Voice retry count': voiceMetrics.retryCount.toString(),
        'Voice no-speech count': voiceMetrics.noSpeechCount.toString(),
        'Voice no-match count': voiceMetrics.noMatchCount.toString(),
        'Voice ambiguous final count': voiceMetrics.ambiguousFinalCount.toString(),
        'Voice processing total (ms)': voiceMetrics.processingMsTotal.toFixed(0),
        'Session performance schema version':
            sessionPerformanceReport?.schemaVersion?.toString() || '',
        'Response onset median (ms)':
            performanceSummary?.medianOnsetLatencyMs?.toString() || '',
        'Response onset fastest (ms)':
            performanceSummary?.fastestOnsetLatencyMs?.toString() || '',
        'Response onset slowest (ms)':
            performanceSummary?.slowestOnsetLatencyMs?.toString() || '',
        'Response completion median (ms)':
            performanceSummary?.medianCompletionLatencyMs?.toString() || '',
        'Response onset measured count':
            performanceSummary?.measuredProblemCount?.toString() || '0',
        'Response completion measured count':
            performanceSummary?.measuredCompletionCount?.toString() || '0',
        'Response onset correct-first median (ms)':
            performanceSummary?.correctFirstTryMedianOnsetMs?.toString() || '',
        'Response onset other-outcome median (ms)':
            performanceSummary?.otherOutcomeMedianOnsetMs?.toString() || '',
        'No input count':
            performanceSummary?.noInputCount?.toString() || '0',
        'Session performance outcome counts JSON': performanceSummary
            ? JSON.stringify(performanceSummary.outcomeCounts)
            : '',
        'Session performance attempt distribution JSON': performanceSummary
            ? JSON.stringify(performanceSummary.attemptCountDistribution)
            : '',
        'Session performance mode breakdown JSON': performanceSummary
            ? JSON.stringify(performanceSummary.modeBreakdown)
            : '',
        'Session Performance Summary JSON': performanceSummary
            ? JSON.stringify(performanceSummary)
            : '',
        'Session Performance Problems JSON': JSON.stringify(performanceProblems),
        'Session Performance Report JSON': sessionPerformanceReport
            ? JSON.stringify(sessionPerformanceReport)
            : '',
    };
}
