import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SessionPerformanceReport,
  SessionProblemPerformance,
} from '../lib/types';
import { palette, theme } from '../theme/colors';
import {
  formatDistribution,
  formatMetric,
  formatPercent,
  formatProblem,
  modeLabel,
  onsetSourceSummary,
} from '../lib/sessionPerformanceFormatting';

interface SessionPerformanceSheetProps {
  visible: boolean;
  report: SessionPerformanceReport | null;
  onClose: () => void;
}

function outcomeLabel(problem: SessionProblemPerformance) {
  switch (problem.outcome) {
    case 'correct_first_try':
      return 'Correct first try';
    case 'wrong_then_correct':
      return 'Correct after retry';
    case 'wrong_only':
      return 'Wrong only';
    case 'reset_incomplete':
      return 'Reset incomplete';
    default:
      return 'No input detected';
  }
}

function outcomeColors(problem: SessionProblemPerformance) {
  switch (problem.outcome) {
    case 'correct_first_try':
      return { bg: palette.green[2], text: palette.green[9] };
    case 'wrong_then_correct':
      return { bg: palette.blue[2], text: palette.blue[9] };
    case 'wrong_only':
      return { bg: palette.red[7], text: palette.white };
    case 'reset_incomplete':
      return { bg: palette.beige[3], text: palette.beige[9] };
    default:
      return { bg: palette.beige[2], text: palette.beige[7] };
  }
}

function outcomeSummaryItems(report: SessionPerformanceReport) {
  return [
    {
      label: 'Correct first try',
      value: report.summary.outcomeCounts.correct_first_try,
      bg: palette.green[2],
      text: palette.green[9],
    },
    {
      label: 'Correct after retry',
      value: report.summary.outcomeCounts.wrong_then_correct,
      bg: palette.blue[2],
      text: palette.blue[9],
    },
    {
      label: 'Wrong only',
      value: report.summary.outcomeCounts.wrong_only,
      bg: palette.red[7],
      text: palette.white,
    },
    {
      label: 'No input',
      value:
        report.summary.outcomeCounts.no_input +
        report.summary.outcomeCounts.reset_incomplete,
      bg: palette.beige[2],
      text: palette.beige[8],
    },
  ].filter(item => item.value > 0);
}

function DiagnosticRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.diagnosticRow}>
      <Text style={styles.diagnosticLabel}>{label}</Text>
      <Text style={styles.diagnosticValue}>{value}</Text>
    </View>
  );
}

export function SessionPerformanceSheet({
  visible,
  report,
  onClose,
}: SessionPerformanceSheetProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visible) {
      setExpandedRows({});
    }
  }, [visible, report?.generatedAtIso]);

  const summaryCards = useMemo(() => {
    if (!report) return [];

    return [
      {
        label: 'Fastest start',
        value: formatMetric(report.summary.fastestOnsetLatencyMs),
        tone: 'neutral' as const,
      },
      {
        label: 'Slowest start',
        value: formatMetric(report.summary.slowestOnsetLatencyMs),
        tone: 'neutral' as const,
      },
      {
        label: 'No input',
        value: String(report.summary.noInputCount),
        tone: 'neutral' as const,
      },
    ];
  }, [report]);

  const secondaryStats = useMemo(() => {
    if (!report) return [];

    return [
      {
        label: 'Problems with onset',
        value: `${report.summary.measuredProblemCount} of ${report.summary.problemCount}`,
      },
      {
        label: 'Completions measured',
        value: `${report.summary.measuredCompletionCount} of ${report.summary.problemCount}`,
      },
      {
        label: 'Median completion',
        value: formatMetric(report.summary.medianCompletionLatencyMs),
      },
      {
        label: 'First-try accuracy',
        value: formatPercent(report.summary.firstTryAccuracyPct),
      },
      {
        label: 'Correct-first onset',
        value: formatMetric(report.summary.correctFirstTryMedianOnsetMs),
      },
      {
        label: 'Other-outcome onset',
        value: formatMetric(report.summary.otherOutcomeMedianOnsetMs),
      },
    ];
  }, [report]);

  const modeSummaryText = useMemo(() => {
    if (!report) return '';

    return (['keypad', 'voice'] as const)
      .map(mode => {
        const summary = report.summary.modeBreakdown[mode];
        if (!summary) return null;
        return `${modeLabel(mode)} ${summary.measuredProblemCount}/${summary.problemCount} measured, median ${formatMetric(summary.medianOnsetLatencyMs)}`;
      })
      .filter(Boolean)
      .join('   ');
  }, [report]);

  if (!report) {
    return null;
  }

  const outcomes = outcomeSummaryItems(report);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>Session Performance</Text>
            <Text style={styles.title}>
              {report.inputMode === 'voice' ? 'Voice Session' : 'Keypad Session'}
            </Text>
            <Text style={styles.subtitle}>{onsetSourceSummary(report)}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroEyebrow}>Response started</Text>
                <Text style={styles.heroValue}>
                  {formatMetric(report.summary.medianOnsetLatencyMs)}
                </Text>
                <Text style={styles.heroCaption}>
                  Typical time from problem display to first response.
                </Text>
              </View>
              <View style={styles.modePill}>
                <Text style={styles.modePillText}>
                  {report.inputMode === 'voice' ? 'Voice' : 'Keypad'}
                </Text>
              </View>
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterLabel}>Attempt distribution</Text>
              <Text style={styles.heroFooterValue}>
                {formatDistribution(report.summary.attemptCountDistribution)}
              </Text>
            </View>
          </View>

          <View style={styles.cardGrid}>
            {summaryCards.map(card => (
              <View key={card.label} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{card.label}</Text>
                <Text style={styles.metricValue}>{card.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryPanel}>
            <Text style={styles.sectionTitle}>Session summary</Text>
            <View style={styles.secondaryGrid}>
              {secondaryStats.map(stat => (
                <View key={stat.label} style={styles.secondaryStatCard}>
                  <Text style={styles.secondaryLabel}>{stat.label}</Text>
                  <Text style={styles.secondaryValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
            {modeSummaryText ? (
              <Text style={styles.modeSummaryText}>{modeSummaryText}</Text>
            ) : null}
          </View>

          {outcomes.length > 0 ? (
            <View style={styles.summaryPanel}>
              <Text style={styles.sectionTitle}>Outcome mix</Text>
              <View style={styles.outcomeRow}>
                {outcomes.map(outcome => (
                  <View
                    key={outcome.label}
                    style={[
                      styles.outcomeChip,
                      { backgroundColor: outcome.bg },
                    ]}
                  >
                    <Text style={[styles.outcomeChipValue, { color: outcome.text }]}>
                      {outcome.value}
                    </Text>
                    <Text style={[styles.outcomeChipLabel, { color: outcome.text }]}>
                      {outcome.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Per-problem results</Text>
            <Text style={styles.listHint}>Tap a row for diagnostics</Text>
          </View>

          <View style={styles.listBlock}>
            {report.problems.map(problem => {
              const isExpanded = !!expandedRows[problem.problemInstanceId];
              const colors = outcomeColors(problem);

              return (
                <Pressable
                  key={problem.problemInstanceId}
                  style={[
                    styles.problemRow,
                    isExpanded ? styles.problemRowExpanded : null,
                  ]}
                  onPress={() =>
                    setExpandedRows(prev => ({
                      ...prev,
                      [problem.problemInstanceId]: !prev[problem.problemInstanceId],
                    }))
                  }
                >
                  <View style={styles.problemRowTop}>
                    <View style={styles.problemTextBlock}>
                      <Text style={styles.problemIndex}>Problem {problem.problemIndex}</Text>
                      <Text style={styles.problemText}>{formatProblem(problem)}</Text>
                    </View>
                    <View style={styles.metricBlock}>
                      <Text style={styles.problemMetricLabel}>Response onset</Text>
                      <Text style={styles.problemMetricValue}>
                        {problem.responseOnsetLatencyMs === null
                          ? 'No input'
                          : formatMetric(problem.responseOnsetLatencyMs)}
                      </Text>
                      <Text style={styles.expandHint}>
                        {isExpanded ? 'Hide details' : 'View details'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.problemMetaRow}>
                    <Text
                      style={[
                        styles.badge,
                        { backgroundColor: colors.bg, color: colors.text },
                      ]}
                    >
                      {outcomeLabel(problem)}
                    </Text>
                    <Text style={styles.metaBadge}>
                      {problem.inputMode === 'voice' ? 'Voice' : 'Keypad'}
                    </Text>
                    <Text style={styles.metaBadge}>Attempts {problem.attemptCount}</Text>
                    <Text style={styles.metaBadge}>
                      Completion {formatMetric(problem.completionLatencyMs)}
                    </Text>
                  </View>

                  {isExpanded ? (
                    <View style={styles.diagnosticsBlock}>
                      <Text style={styles.diagnosticsTitle}>Diagnostics</Text>
                      <DiagnosticRow
                        label="Submitted values"
                        value={problem.submittedValues.join(', ') || 'None'}
                      />
                      {problem.inputMode === 'keypad' ? (
                        <>
                          <DiagnosticRow
                            label="Problem display"
                            value={formatMetric(problem.presentedAtPerfMs)}
                          />
                          <DiagnosticRow
                            label="First digit"
                            value={formatMetric(problem.keypadDiagnostics.firstDigitPerfMs)}
                          />
                        </>
                      ) : (
                        <>
                          <DiagnosticRow
                            label="Problem display"
                            value={formatMetric(problem.presentedAtPerfMs)}
                          />
                          <DiagnosticRow
                            label="Speech start"
                            value={formatMetric(problem.voiceDiagnostics.speechStartPerfMs)}
                          />
                          <DiagnosticRow
                            label="Speech end"
                            value={formatMetric(problem.voiceDiagnostics.speechEndPerfMs)}
                          />
                          <DiagnosticRow
                            label="Final result"
                            value={formatMetric(problem.voiceDiagnostics.finalResultPerfMs)}
                          />
                          <DiagnosticRow
                            label="Processing"
                            value={formatMetric(problem.voiceDiagnostics.voiceProcessingMs)}
                          />
                          <DiagnosticRow
                            label="Transcript"
                            value={problem.voiceDiagnostics.transcript || 'None'}
                          />
                        </>
                      )}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTextBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 6,
    fontSize: 30,
    fontFamily: 'Fredoka_400Regular',
    color: palette.beige[9],
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 360,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[7],
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: palette.beige[2],
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[9],
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.beige[1],
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroValue: {
    marginTop: 8,
    fontSize: 40,
    lineHeight: 44,
    fontFamily: 'Nunito_700Bold',
    color: palette.beige[9],
  },
  heroCaption: {
    marginTop: 8,
    maxWidth: 320,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[7],
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.beige[2],
  },
  modePillText: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[9],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.beige[1],
  },
  heroFooterLabel: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
  },
  heroFooterValue: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[8],
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minWidth: '31%',
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: palette.beige[2],
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: palette.beige[9],
  },
  summaryPanel: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: palette.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Fredoka_400Regular',
    color: palette.beige[9],
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  secondaryStatCard: {
    minWidth: '47%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: palette.beige[1],
  },
  secondaryLabel: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
  },
  secondaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: palette.beige[9],
  },
  modeSummaryText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[7],
  },
  outcomeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  outcomeChip: {
    minWidth: '47%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
  },
  outcomeChipValue: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
  },
  outcomeChipLabel: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  listHint: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
  },
  listBlock: {
    gap: 10,
  },
  problemRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  problemRowExpanded: {
    borderColor: palette.beige[2],
  },
  problemRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  problemTextBlock: {
    flex: 1,
  },
  problemIndex: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
  },
  problemText: {
    marginTop: 6,
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: palette.beige[9],
  },
  metricBlock: {
    alignItems: 'flex-end',
    minWidth: 118,
  },
  problemMetricLabel: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
  },
  problemMetricValue: {
    marginTop: 6,
    fontSize: 18,
    textAlign: 'right',
    fontFamily: 'Nunito_700Bold',
    color: palette.beige[9],
  },
  expandHint: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
  },
  problemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.beige[1],
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[8],
  },
  diagnosticsBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.beige[1],
    gap: 8,
  },
  diagnosticsTitle: {
    fontSize: 12,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
    textTransform: 'uppercase',
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  diagnosticLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[6],
  },
  diagnosticValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Archivo_400Regular',
    color: palette.beige[8],
  },
});
