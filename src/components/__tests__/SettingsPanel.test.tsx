import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsPanel } from '../SettingsPanel';
import { SessionOptions } from '../../lib/types';

function createOptions(overrides: Partial<SessionOptions> = {}): SessionOptions {
  return {
    operation: 'addsub',
    problemOrder: 'random',
    operandOrder: 'standard',
    missingValue: 'random',
    startMode: 'full',
    autoShowPerformanceReport: true,
    setsMode: 'cycles',
    activeChips: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    customSet: null,
    practiceCycles: 2,
    ...overrides,
  };
}

describe('SettingsPanel', () => {
  it('renders operation-specific custom sets', () => {
    const updateOptions = jest.fn();
    const setUseTimer = jest.fn();
    const view = render(
      <SettingsPanel
        options={createOptions({ operation: 'addsub' })}
        updateOptions={updateOptions}
        useTimer
        setUseTimer={setUseTimer}
      />
    );

    expect(view.getByLabelText("custom-set-10s:10's")).toBeTruthy();
    expect(view.getByLabelText('custom-set-doubles:n+n')).toBeTruthy();

    view.rerender(
      <SettingsPanel
        options={createOptions({ operation: 'multdiv' })}
        updateOptions={updateOptions}
        useTimer
        setUseTimer={setUseTimer}
      />
    );

    expect(view.queryByLabelText("custom-set-10s:10's")).toBeNull();
    expect(view.queryByLabelText('custom-set-doubles:n+n')).toBeNull();
    expect(view.getByLabelText('custom-set-squares:n²')).toBeTruthy();
  });

  it('keeps global setting labels stable across operations', () => {
    const updateOptions = jest.fn();
    const setUseTimer = jest.fn();
    const globalState = createOptions({
      autoShowPerformanceReport: true,
      startMode: 'min',
    });
    const view = render(
      <SettingsPanel
        options={globalState}
        updateOptions={updateOptions}
        useTimer={false}
        setUseTimer={setUseTimer}
      />
    );

    expect(view.getByLabelText('setting-reports:Instant')).toBeTruthy();
    expect(view.getByLabelText('setting-timer:Off')).toBeTruthy();
    expect(view.getByLabelText('setting-start-sequence:Minimize')).toBeTruthy();

    view.rerender(
      <SettingsPanel
        options={createOptions({
          operation: 'multdiv',
          autoShowPerformanceReport: true,
          startMode: 'min',
          problemOrder: 'standard',
          operandOrder: 'reverse',
          missingValue: 'operand',
        })}
        updateOptions={updateOptions}
        useTimer={false}
        setUseTimer={setUseTimer}
      />
    );

    expect(view.getByLabelText('setting-reports:Instant')).toBeTruthy();
    expect(view.getByLabelText('setting-timer:Off')).toBeTruthy();
    expect(view.getByLabelText('setting-start-sequence:Minimize')).toBeTruthy();
  });

  it('reflects sets mode and enum labels in the selector buttons', () => {
    const updateOptions = jest.fn();
    const setUseTimer = jest.fn();
    const view = render(
      <SettingsPanel
        options={createOptions({
          setsMode: 'single',
          problemOrder: 'standard',
          operandOrder: 'reverse',
          missingValue: 'operand',
        })}
        updateOptions={updateOptions}
        useTimer
        setUseTimer={setUseTimer}
      />
    );

    expect(view.getByLabelText('setting-cycles-target:Set')).toBeTruthy();
    expect(view.getByLabelText('setting-problem-order:Standard')).toBeTruthy();
    expect(view.getByLabelText('setting-operand-order:Reverse')).toBeTruthy();
    expect(view.getByLabelText('setting-missing-value:Operand')).toBeTruthy();

    view.rerender(
      <SettingsPanel
        options={createOptions({
          setsMode: 'cycles',
          problemOrder: 'random',
          operandOrder: 'standard',
          missingValue: 'result',
        })}
        updateOptions={updateOptions}
        useTimer
        setUseTimer={setUseTimer}
      />
    );

    expect(view.getByLabelText('setting-cycles-target:Problem')).toBeTruthy();
    expect(view.getByLabelText('setting-problem-order:Random')).toBeTruthy();
    expect(view.getByLabelText('setting-operand-order:Standard')).toBeTruthy();
    expect(view.getByLabelText('setting-missing-value:Result')).toBeTruthy();
  });

  it('does not fire handlers while disabled', () => {
    const updateOptions = jest.fn();
    const setUseTimer = jest.fn();
    const view = render(
      <SettingsPanel
        options={createOptions()}
        updateOptions={updateOptions}
        useTimer
        setUseTimer={setUseTimer}
        disabled
      />
    );

    const digitChip = view.getByLabelText('digit-chip-1') as { props: { disabled?: boolean } };
    const timerButton = view.getByLabelText('setting-timer:On') as {
      props: { disabled?: boolean };
    };

    expect(digitChip.props.disabled).toBe(true);
    expect(timerButton.props.disabled).toBe(true);
    expect(updateOptions).not.toHaveBeenCalled();
    expect(setUseTimer).not.toHaveBeenCalled();
  });
});
