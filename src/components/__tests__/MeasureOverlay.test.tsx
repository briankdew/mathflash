import React from 'react';
import { render } from '@testing-library/react-native';
import { MeasureOverlay } from '../MeasureOverlay';

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => {
      const chain = {
        onBegin: () => chain,
        onUpdate: () => chain,
        onFinalize: () => chain,
      };
      return chain;
    },
  },
}));

describe('MeasureOverlay', () => {
  it('renders nothing while disabled', () => {
    const view = render(
      <MeasureOverlay
        enabled={false}
        safeAreaHeight={400}
        safeAreaWidth={300}
        lineY={200}
        onChangeLineY={jest.fn()}
        labelX={150}
        onChangeLabelX={jest.fn()}
      />
    );

    expect(view.toJSON()).toBeNull();
  });

  it('renders the line and measurement label while enabled', () => {
    const view = render(
      <MeasureOverlay
        enabled
        safeAreaHeight={400}
        safeAreaWidth={300}
        lineY={200}
        onChangeLineY={jest.fn()}
        labelX={150}
        onChangeLabelX={jest.fn()}
      />
    );

    expect(view.toJSON()).toBeTruthy();
  });
});
