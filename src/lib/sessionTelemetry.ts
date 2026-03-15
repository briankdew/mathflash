import {
    SessionInputMode,
    SessionOptions,
    SessionStats,
    VoiceSessionMetrics,
} from './types';

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
}: BuildSessionLogPayloadArgs): Record<string, string> {
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
        // Formatting other columns omitted for brevity but should be hydrated before saveLogToCloud is called natively.
    };
}
