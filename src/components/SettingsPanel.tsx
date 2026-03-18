import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Defs,
  Filter,
  FeFlood,
  FeBlend,
  FeColorMatrix,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  Rect,
} from 'react-native-svg';
import { SessionOptions } from '../lib/types';
import { SessionOptionsUpdate } from '../lib/sessionOptions';
import { theme, palette } from '../theme/colors';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const InnerShadowBox = ({
  width,
  height,
  rx,
  fill,
}: {
  width: number;
  height: number;
  rx: number;
  fill: string;
}) => (
  <Svg
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
    style={StyleSheet.absoluteFill}
  >
    <Defs>
      <Filter
        id="chipInnerShadow"
        x="-0.2"
        y="-0.2"
        width="1.4"
        height="1.4"
        filterUnits="objectBoundingBox"
      >
        <FeFlood floodOpacity="0" result="BackgroundImageFix" />
        <FeBlend
          mode="normal"
          in="SourceGraphic"
          in2="BackgroundImageFix"
          result="shape"
        />
        <FeColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <FeOffset dy="3" />
        <FeGaussianBlur stdDeviation="1.6" />
        <FeComposite
          in2="hardAlpha"
          operator="arithmetic"
          k2="-1"
          k3="1"
          result="shadowInnerInner1"
        />
        <FeColorMatrix
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0"
        />
        <FeBlend mode="normal" in2="shape" result="effect1_innerShadow" />
      </Filter>
    </Defs>
    <Rect width={width} height={height} rx={rx} fill={fill} filter="url(#chipInnerShadow)" />
  </Svg>
);

interface SettingsPanelProps {
  options: SessionOptions;
  updateOptions: (update: SessionOptionsUpdate) => void;
  useTimer: boolean;
  setUseTimer: (val: boolean) => void;
  disabled?: boolean;
}

interface ChipButtonProps {
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  width?: number;
}

function ChipButton({
  active,
  disabled,
  onPress,
  children,
  width = 64,
}: ChipButtonProps) {
  const height = width === 64 ? 44 : 44;
  return (
    <TouchableOpacity
      style={[
        width === 64 ? styles.digitBox : styles.timerBox,
        active && styles.chipActive,
        disabled && styles.chipDisabled,
        width !== 64 ? { width } : null,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {active ? <InnerShadowBox width={width} height={height} rx={10} fill="#C0BEB1" /> : null}
      {children}
    </TouchableOpacity>
  );
}

function SettingItem({
  label,
  disabled,
  onPress,
  value,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  value: string;
}) {
  return (
    <View style={styles.settingItem}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBtn, disabled && styles.chipDisabled]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.selectBtnText}>{value}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SettingsPanel({
  options,
  updateOptions,
  useTimer,
  setUseTimer,
  disabled,
}: SettingsPanelProps) {
  const isAddSubOperation = options.operation === 'addsub';
  const isAllMode = !options.customSet && options.activeChips.length === DIGITS.length;
  const setsDisplayValue =
    options.practiceCycles <= 1
      ? '1'
      : options.setsMode === 'single'
        ? '1'
        : String(options.practiceCycles);

  const digitActions = DIGITS.map(value => ({
    value,
    active: !options.customSet && options.activeChips.includes(value),
  }));
  const compactSettings = [
    {
      label: 'CYC',
      value: String(options.practiceCycles),
      disabled: !!disabled,
      onPress: () => updateOptions({ type: 'cyclePracticeCycles' }),
    },
    {
      label: 'SETS',
      value: setsDisplayValue,
      disabled: !!disabled || options.practiceCycles <= 1,
      onPress: () => updateOptions({ type: 'toggleSetsMode' }),
    },
  ];
  const selectSettings = [
    {
      label: 'PO',
      value: options.problemOrder === 'random' ? 'Ran' : 'Std',
      onPress: () => updateOptions({ type: 'cycleProblemOrder' }),
    },
    {
      label: 'OO',
      value:
        options.operandOrder === 'random'
          ? 'Ran'
          : options.operandOrder === 'standard'
            ? 'Std'
            : 'Rev',
      onPress: () => updateOptions({ type: 'cycleOperandOrder' }),
    },
    {
      label: 'MV',
      value:
        options.missingValue === 'result'
          ? 'Res'
          : options.missingValue === 'operand'
            ? 'Opd'
            : 'Ran',
      onPress: () => updateOptions({ type: 'cycleMissingValue' }),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.controlGroup}>
        <View style={styles.digitGrid}>
          {digitActions.map(({ value, active }) => (
            <ChipButton
              key={value}
              active={active}
              disabled={disabled}
              onPress={() => updateOptions({ type: 'toggleChip', value })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
            </ChipButton>
          ))}
          <ChipButton
            active={isAllMode}
            disabled={disabled}
            onPress={() => updateOptions({ type: 'toggleAllChips' })}
          >
            <Text style={[styles.chipTextAllClr, isAllMode && styles.chipTextActive]}>
              {isAllMode ? 'Clear\nAll' : 'Select\nAll'}
            </Text>
          </ChipButton>
        </View>
      </View>

      <View style={styles.customRow}>
        {isAddSubOperation ? (
          <>
            <ChipButton
              active={options.customSet === '10s'}
              disabled={disabled}
              onPress={() => updateOptions({ type: 'toggleCustomSet', customSet: '10s' })}
            >
              <Text
                style={[
                  styles.chipText,
                  options.customSet === '10s' && styles.chipTextActive,
                ]}
              >
                10&apos;s
              </Text>
            </ChipButton>
            <ChipButton
              active={options.customSet === 'doubles'}
              disabled={disabled}
              onPress={() =>
                updateOptions({ type: 'toggleCustomSet', customSet: 'doubles' })
              }
            >
              <Text
                style={[
                  styles.chipTextMath,
                  options.customSet === 'doubles' && styles.chipTextActiveMath,
                ]}
              >
                n+n
              </Text>
            </ChipButton>
          </>
        ) : (
          <ChipButton
            active={options.customSet === 'squares'}
            disabled={disabled}
            onPress={() =>
              updateOptions({ type: 'toggleCustomSet', customSet: 'squares' })
            }
          >
            <Text
              style={[
                styles.chipTextMath,
                options.customSet === 'squares' && styles.chipTextActiveMath,
              ]}
            >
              n²
            </Text>
          </ChipButton>
        )}

        {compactSettings.map(setting => (
          <TouchableOpacity
            key={setting.label}
            style={[styles.compactSettingBtn, setting.disabled && styles.chipDisabled]}
            onPress={setting.onPress}
            disabled={setting.disabled}
          >
            <Text style={styles.compactSettingLabel}>{setting.label}</Text>
            <Text style={styles.compactSettingValue}>{setting.value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.settingsRow}>
        {selectSettings.map(setting => (
          <SettingItem
            key={setting.label}
            label={setting.label}
            disabled={disabled}
            onPress={setting.onPress}
            value={setting.value}
          />
        ))}

        <View style={styles.settingItem}>
          <Text style={styles.label}>TIMER</Text>
          <ChipButton
            active={useTimer}
            disabled={disabled}
            onPress={() => setUseTimer(!useTimer)}
            width={44}
          >
            <Text style={[styles.chipTextAllClr, useTimer && styles.chipTextActive]}>
              {useTimer ? 'On' : 'Off'}
            </Text>
          </ChipButton>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>START</Text>
          <ChipButton
            active={options.startMode === 'full'}
            disabled={disabled}
            onPress={() => updateOptions({ type: 'toggleStartMode' })}
            width={44}
          >
            <Text
              style={[
                styles.chipTextAllClr,
                options.startMode === 'full' && styles.chipTextActive,
              ]}
            >
              {options.startMode === 'full' ? 'Full' : 'Min'}
            </Text>
          </ChipButton>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>REPORT</Text>
          <ChipButton
            active={options.autoShowPerformanceReport}
            disabled={disabled}
            onPress={() => updateOptions({ type: 'toggleAutoShowPerformanceReport' })}
            width={44}
          >
            <Text
              style={[
                styles.chipTextAllClr,
                options.autoShowPerformanceReport && styles.chipTextActive,
              ]}
            >
              {options.autoShowPerformanceReport ? 'On' : 'Off'}
            </Text>
          </ChipButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 6,
    width: 352,
    alignSelf: 'center',
  },
  controlGroup: {
    marginBottom: 8,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    width: 352,
    alignSelf: 'center',
    marginBottom: 16,
  },
  settingItem: {
    alignItems: 'center',
    marginTop: -2,
  },
  label: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: -3,
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  selectBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C0BEB1',
    borderRadius: 10,
  },
  selectBtnText: {
    fontSize: 16,
    color: '#615e4e',
    fontFamily: 'NotoSans_500Medium',
  },
  compactSettingBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C0BEB1',
    borderRadius: 10,
  },
  compactSettingLabel: {
    position: 'absolute',
    top: 5,
    fontSize: 8,
    lineHeight: 9,
    letterSpacing: 0.2,
    color: '#615e4e',
    fontFamily: 'Archivo_400Regular',
  },
  compactSettingValue: {
    marginTop: 9,
    fontSize: 16,
    color: '#615e4e',
    fontFamily: 'NotoSans_500Medium',
  },
  digitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: 352,
    alignSelf: 'center',
  },
  digitBox: {
    width: 64,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  timerBox: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  chipActive: {
    backgroundColor: '#C0BEB1',
    shadowOpacity: 0,
    elevation: 0,
  },
  chipText: {
    fontSize: 22,
    color: palette.beige[3],
    fontFamily: 'NotoSans_500Medium',
  },
  chipTextActive: {
    color: '#615e4e',
  },
  chipTextMath: {
    fontSize: 22,
    color: palette.beige[3],
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  chipTextActiveMath: {
    color: '#615e4e',
  },
  chipTextAllClr: {
    fontFamily: 'NotoSans_500Medium',
    fontSize: 16,
    lineHeight: 17,
    color: palette.beige[3],
    textAlign: 'center',
  },
  chipDisabled: {
    opacity: 0.5,
  },
});
