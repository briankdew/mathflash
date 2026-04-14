import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import { SessionOptions } from '../lib/types';
import { SessionOptionsUpdate } from '../lib/sessionOptions';
import { palette } from '../theme/colors';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const TRAY_WIDTH = 373;
const SECTION_WIDTH = 353;
const SECTION_RADIUS = 18;
const SECTION_SIDE_INSET = 10;
const SECTION_BORDER_WIDTH = 1;
const CHIP_ROW_WIDTH =
  SECTION_WIDTH - SECTION_SIDE_INSET * 2 - SECTION_BORDER_WIDTH * 2;
const BASIC_FACTS_CHIP_WIDTH = 60;
const BASIC_FACTS_COLUMNS = 5;
const SHARED_CHIP_ROW_GAP =
  (CHIP_ROW_WIDTH - BASIC_FACTS_CHIP_WIDTH * BASIC_FACTS_COLUMNS) /
  (BASIC_FACTS_COLUMNS - 1);

type TrayColorTheme = {
  trayBg: string;
  trayOutline: string;
  sectionBorder: string;
  sectionHeaderText: string;
  sectionHeaderBg: string;
  globalBorder: string;
  globalHeaderText: string;
  globalHeaderBg: string;
  lightChipBg: string;
  lightChipText: string;
  selectorText: string;
  globalLabelText: string;
  darkSelectorBg: string;
};

function getTrayColorTheme(operation: SessionOptions['operation']): TrayColorTheme {
  if (operation === 'multdiv') {
    return {
      trayBg: palette.green[4],
      trayOutline: 'rgba(255,255,255,0.9)',
      sectionBorder: palette.green[8],
      sectionHeaderText: palette.green[8],
      sectionHeaderBg: palette.green[4],
      globalBorder: palette.white,
      globalHeaderText: palette.white,
      globalHeaderBg: palette.green[4],
      lightChipBg: palette.green[2],
      lightChipText: palette.green[7],
      selectorText: palette.green[7],
      globalLabelText: palette.green[8],
      darkSelectorBg: palette.green[7],
    };
  }

  return {
    trayBg: palette.blue[4],
    trayOutline: 'rgba(255,255,255,0.9)',
    sectionBorder: palette.blue[8],
    sectionHeaderText: palette.blue[8],
    sectionHeaderBg: palette.blue[4],
    globalBorder: palette.white,
    globalHeaderText: palette.white,
    globalHeaderBg: palette.blue[4],
    lightChipBg: palette.blue[2],
    lightChipText: palette.blue[7],
    selectorText: palette.blue[7],
    globalLabelText: palette.blue[8],
    darkSelectorBg: palette.blue[7],
  };
}

function getProblemOrderLabel(value: SessionOptions['problemOrder']) {
  return value === 'random' ? 'Random' : 'Standard';
}

function getOperandOrderLabel(value: SessionOptions['operandOrder']) {
  if (value === 'random') return 'Random';
  if (value === 'reverse') return 'Reverse';
  return 'Standard';
}

function getMissingValueLabel(value: SessionOptions['missingValue']) {
  if (value === 'random') return 'Random';
  if (value === 'operand') return 'Operand';
  return 'Result';
}

type ChipVariant = 'selection' | 'action' | 'dark';

interface TrayChipProps {
  active?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
  colors: TrayColorTheme;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  textStyle?: TextStyle;
  variant?: ChipVariant;
  width?: number;
}

function TrayChip({
  active = false,
  accessibilityLabel,
  children,
  colors,
  disabled,
  onPress,
  testID,
  textStyle,
  variant = 'selection',
  width = 60,
}: TrayChipProps) {
  const isRaised = active || variant === 'action' || variant === 'dark';
  const backgroundColor =
    variant === 'dark'
      ? colors.darkSelectorBg
      : active || variant === 'action'
        ? palette.white
        : colors.lightChipBg;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel ?? testID}
      accessibilityRole="button"
      accessibilityState={disabled ? { disabled: true } : undefined}
      testID={testID}
      style={[
        styles.trayChip,
        { width, backgroundColor },
        isRaised ? styles.raisedButton : null,
        disabled ? styles.disabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
    >
      <Text
        style={[
          styles.trayChipText,
          variant === 'dark'
            ? { color: palette.white }
            : { color: colors.lightChipText },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

function SectionHeader({
  backgroundColor,
  color,
  title,
  width,
}: {
  backgroundColor: string;
  color: string;
  title: string;
  width: number;
}) {
  return (
    <View
      style={[
        styles.sectionHeader,
        {
          width,
          backgroundColor,
          marginLeft: -(width / 2),
        },
      ]}
    >
      <Text style={[styles.sectionHeaderText, { color }]}>{title}</Text>
    </View>
  );
}

function TraySection({
  backgroundColor,
  borderColor,
  children,
  headerBackground,
  headerColor,
  headerWidth,
  title,
}: {
  backgroundColor: string;
  borderColor: string;
  children: React.ReactNode;
  headerBackground: string;
  headerColor: string;
  headerWidth: number;
  title: string;
}) {
  return (
    <View style={[styles.section, { borderColor, backgroundColor }]}>
      <SectionHeader
        backgroundColor={headerBackground}
        color={headerColor}
        title={title}
        width={headerWidth}
      />
      {children}
    </View>
  );
}

function RowLabel({
  color,
  text,
}: {
  color: string;
  text: string;
}) {
  return <Text style={[styles.rowLabel, { color }]}>{text}</Text>;
}

function SelectorRow({
  accessibilityLabel,
  buttonText,
  buttonWidth = 106,
  colors,
  disabled,
  label,
  labelColor,
  onPress,
  testID,
  variant = 'action',
}: {
  accessibilityLabel?: string;
  buttonText: string;
  buttonWidth?: number;
  colors: TrayColorTheme;
  disabled?: boolean;
  label: string;
  labelColor: string;
  onPress: () => void;
  testID?: string;
  variant?: ChipVariant;
}) {
  return (
    <View style={styles.selectorRow}>
      <RowLabel color={labelColor} text={label} />
      <TrayChip
        accessibilityLabel={accessibilityLabel}
        colors={colors}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
        variant={variant}
        width={buttonWidth}
      >
        {buttonText}
      </TrayChip>
    </View>
  );
}

interface SettingsPanelProps {
  options: SessionOptions;
  updateOptions: (update: SessionOptionsUpdate) => void;
  useTimer: boolean;
  setUseTimer: (val: boolean) => void;
  isMeasureOverlayEnabled: boolean;
  setIsMeasureOverlayEnabled: (val: boolean) => void;
  disabled?: boolean;
}

export function SettingsPanel({
  options,
  updateOptions,
  useTimer,
  setUseTimer,
  isMeasureOverlayEnabled,
  setIsMeasureOverlayEnabled,
  disabled,
}: SettingsPanelProps) {
  const colors = getTrayColorTheme(options.operation);
  const isAddSubOperation = options.operation === 'addsub';
  const isAllMode = !options.customSet && options.activeChips.length === DIGITS.length;
  const selectedDigits =
    options.customSet === null ? new Set(options.activeChips) : new Set<number>();
  const cycleValue = `${options.practiceCycles}x`;
  const cycleTargetLabel = options.setsMode === 'cycles' ? 'Problem' : 'Set';
  const digitRows = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9],
  ] as const;
  const globalRows = [
    {
      label: 'Reports',
      testID: 'setting-reports',
      value: options.autoShowPerformanceReport ? 'Instant' : 'Off',
      onPress: () => updateOptions({ type: 'toggleAutoShowPerformanceReport' }),
    },
    {
      label: 'Timer',
      testID: 'setting-timer',
      value: useTimer ? 'On' : 'Off',
      onPress: () => setUseTimer(!useTimer),
    },
    {
      label: 'Start sequence',
      testID: 'setting-start-sequence',
      value: options.startMode === 'min' ? 'Minimize' : 'Full',
      onPress: () => updateOptions({ type: 'toggleStartMode' }),
    },
  ];
  if (__DEV__) {
    globalRows.push({
      label: 'Measure',
      testID: 'setting-measure',
      value: isMeasureOverlayEnabled ? 'On' : 'Off',
      onPress: () => setIsMeasureOverlayEnabled(!isMeasureOverlayEnabled),
    });
  }
  const presentationRows = [
    {
      label: 'Problem order',
      testID: 'setting-problem-order',
      value: getProblemOrderLabel(options.problemOrder),
      onPress: () => updateOptions({ type: 'cycleProblemOrder' }),
    },
    {
      label: 'Operand order',
      testID: 'setting-operand-order',
      value: getOperandOrderLabel(options.operandOrder),
      onPress: () => updateOptions({ type: 'cycleOperandOrder' }),
    },
    {
      label: 'Missing value',
      testID: 'setting-missing-value',
      value: getMissingValueLabel(options.missingValue),
      onPress: () => updateOptions({ type: 'cycleMissingValue' }),
    },
  ];

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.tray,
          {
            backgroundColor: colors.trayBg,
            borderColor: colors.trayOutline,
          },
        ]}
      >
        <TraySection
          backgroundColor="transparent"
          borderColor={colors.sectionBorder}
          headerBackground={colors.sectionHeaderBg}
          headerColor={colors.sectionHeaderText}
          headerWidth={198}
          title="Problem Set Selection"
        >
          <Text style={styles.groupLabel}>Basic facts</Text>
          <View style={styles.digitGrid}>
            {digitRows.map((row, rowIndex) => (
              <View key={`digit-row-${rowIndex}`} style={styles.chipRow}>
                {row.map(value => {
                  const active = selectedDigits.has(value);

                  return (
                    <TrayChip
                      key={value}
                      active={active}
                      colors={colors}
                      disabled={disabled}
                      onPress={() => updateOptions({ type: 'toggleChip', value })}
                      testID={`digit-chip-${value}`}
                      textStyle={styles.digitChipText}
                    >
                      {value}
                    </TrayChip>
                  );
                })}

                {rowIndex === 1 ? (
                  <TrayChip
                    active={isAllMode}
                    colors={colors}
                    disabled={disabled}
                    onPress={() => updateOptions({ type: 'toggleAllChips' })}
                    testID="digit-chip-all"
                    textStyle={styles.allChipText}
                  >
                    {isAllMode ? 'Clear\nAll' : 'Select\nAll'}
                  </TrayChip>
                ) : null}
              </View>
            ))}
          </View>

          <Text style={[styles.groupLabel, styles.customSetsLabel]}>Custom sets</Text>
          <View style={styles.customRow}>
            {isAddSubOperation ? (
              <>
                <TrayChip
                  accessibilityLabel={`custom-set-10s:10's`}
                  active={options.customSet === '10s'}
                  colors={colors}
                  disabled={disabled}
                  onPress={() => updateOptions({ type: 'toggleCustomSet', customSet: '10s' })}
                  testID="custom-set-10s"
                  textStyle={styles.customChipText}
                  width={61}
                >
                  {"10's"}
                </TrayChip>
                <TouchableOpacity
                  accessibilityLabel="custom-set-doubles:n+n"
                  accessibilityRole="button"
                  accessibilityState={disabled ? { disabled: true } : undefined}
                  testID="custom-set-doubles"
                  style={[
                    styles.trayChip,
                    { width: 61 },
                    options.customSet === 'doubles'
                      ? [styles.raisedButton, { backgroundColor: palette.white }]
                      : { backgroundColor: colors.lightChipBg },
                    disabled ? styles.disabled : null,
                  ]}
                  onPress={() =>
                    updateOptions({ type: 'toggleCustomSet', customSet: 'doubles' })
                  }
                  disabled={disabled}
                  activeOpacity={0.82}
                >
                  <Text
                    style={[
                      styles.mathChipText,
                      { color: colors.lightChipText },
                    ]}
                  >
                    n+n
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  accessibilityLabel="custom-set-squares:n²"
                  accessibilityRole="button"
                  accessibilityState={disabled ? { disabled: true } : undefined}
                  testID="custom-set-squares"
                  style={[
                    styles.trayChip,
                    { width: 61 },
                    options.customSet === 'squares'
                      ? [styles.raisedButton, { backgroundColor: palette.white }]
                      : { backgroundColor: colors.lightChipBg },
                    disabled ? styles.disabled : null,
                  ]}
                  onPress={() =>
                    updateOptions({ type: 'toggleCustomSet', customSet: 'squares' })
                  }
                  disabled={disabled}
                  activeOpacity={0.82}
                >
                  <Text
                    style={[
                      styles.mathChipText,
                      { color: colors.lightChipText },
                    ]}
                  >
                    n²
                  </Text>
                </TouchableOpacity>
                <View style={styles.customSpacer} />
              </>
            )}
          </View>
        </TraySection>

        <TraySection
          backgroundColor="transparent"
          borderColor={colors.sectionBorder}
          headerBackground={colors.sectionHeaderBg}
          headerColor={colors.sectionHeaderText}
          headerWidth={193}
          title="Problem Presentation"
        >
          <View style={styles.presentationRows}>
            <View style={styles.selectorRow}>
              <RowLabel color={palette.white} text="Cycles" />
              <View style={styles.cyclesControl}>
                <TrayChip
                  accessibilityLabel={`setting-cycles-value:${cycleValue}`}
                  colors={colors}
                  disabled={disabled}
                  onPress={() => updateOptions({ type: 'cyclePracticeCycles' })}
                  testID="setting-cycles-value"
                  textStyle={styles.cycleValueText}
                  variant="action"
                  width={48}
                >
                  {cycleValue}
                </TrayChip>
                <Text style={styles.perLabel}>per</Text>
                <TrayChip
                  accessibilityLabel={`setting-cycles-target:${cycleTargetLabel}`}
                  colors={colors}
                  disabled={disabled || options.practiceCycles <= 1}
                  onPress={() => updateOptions({ type: 'toggleSetsMode' })}
                  testID="setting-cycles-target"
                  variant="action"
                  width={106}
                >
                  {cycleTargetLabel}
                </TrayChip>
              </View>
            </View>

            {presentationRows.map(row => (
              <SelectorRow
                accessibilityLabel={`${row.testID}:${row.value}`}
                key={row.label}
                buttonText={row.value}
                colors={colors}
                disabled={disabled}
                label={row.label}
                labelColor={palette.white}
                onPress={row.onPress}
                testID={row.testID}
              />
            ))}
          </View>
        </TraySection>

        <TraySection
          backgroundColor="transparent"
          borderColor={colors.globalBorder}
          headerBackground={colors.globalHeaderBg}
          headerColor={colors.globalHeaderText}
          headerWidth={140}
          title="Global Settings"
        >
          <View style={styles.presentationRows}>
            {globalRows.map(row => (
              <SelectorRow
                accessibilityLabel={`${row.testID}:${row.value}`}
                key={row.label}
                buttonText={row.value}
                colors={colors}
                disabled={disabled}
                label={row.label}
                labelColor={colors.globalLabelText}
                onPress={row.onPress}
                testID={row.testID}
                variant="dark"
              />
            ))}
          </View>
        </TraySection>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
  },
  tray: {
    width: TRAY_WIDTH,
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 68,
    paddingBottom: 12,
    paddingHorizontal: 10,
  },
  section: {
    width: SECTION_WIDTH,
    borderWidth: 1,
    borderRadius: SECTION_RADIUS,
    paddingTop: 23,
    paddingBottom: 10,
    paddingHorizontal: SECTION_SIDE_INSET,
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  sectionHeader: {
    position: 'absolute',
    top: -12,
    left: '50%',
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    fontSize: 19,
    lineHeight: 20,
    fontFamily: 'Archivo_400Regular',
  },
  groupLabel: {
    fontSize: 19,
    lineHeight: 20,
    color: palette.white,
    fontFamily: 'Archivo_400Regular',
    marginBottom: 10,
  },
  customSetsLabel: {
    marginBottom: 8,
  },
  digitGrid: {
    gap: 8,
    marginBottom: 12,
  },
  chipRow: {
    width: CHIP_ROW_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SHARED_CHIP_ROW_GAP,
  },
  customRow: {
    width: CHIP_ROW_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SHARED_CHIP_ROW_GAP,
  },
  customSpacer: {
    width: 61,
    height: 48,
  },
  trayChip: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  trayChipText: {
    fontSize: 18,
    lineHeight: 20,
    fontFamily: 'NotoSans_500Medium',
    textAlign: 'center',
  },
  mathChipText: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    textAlign: 'center',
  },
  digitChipText: {
    fontSize: 26,
    lineHeight: 28,
  },
  allChipText: {
    fontSize: 17,
    lineHeight: 18,
  },
  customChipText: {
    fontSize: 25,
    lineHeight: 28,
  },
  cycleValueText: {
    fontSize: 19,
    lineHeight: 20,
  },
  raisedButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  presentationRows: {
    gap: 12,
  },
  selectorRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 19,
    lineHeight: 22,
    fontFamily: 'Archivo_400Regular',
    paddingRight: 10,
  },
  cyclesControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perLabel: {
    fontSize: 19,
    lineHeight: 20,
    color: palette.white,
    fontFamily: 'Archivo_400Regular',
  },
});
