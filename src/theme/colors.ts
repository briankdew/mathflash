// Theming mappings derived from OKLCH conversions of the original web version.
// Values mapped to hex colors roughly matching original scales.

export const palette = {
    white: '#ffffff',
    bg: '#f4f2e7',

    beige: {
        0: '#e7e5d9',
        1: '#dad8cc',
        2: '#c0beb1',
        3: '#a7a597',
        4: '#8f8d7e',
        5: '#777565',
        6: '#615e4e',
        7: '#4b4837',
        8: '#363322',
        9: '#22200e',
        10: '#100d00',
    },

    blue: {
        0: '#e8f3ff',
        1: '#c7daef',
        2: '#a6c1de',
        3: '#85a8cd',
        4: '#6b90b6',
        5: '#53789e',
        6: '#3a6187',
        7: '#224a71',
        8: '#07345b',
        9: '#001f46',
        10: '#000a2f',
    },

    green: {
        0: '#ecf5e8',
        1: '#cdddc6',
        2: '#afc6a6',
        3: '#91ae85',
        4: '#79966c',
        5: '#607f53',
        6: '#49683b',
        7: '#325124',
        8: '#1d3c0b',
        9: '#072700',
        10: '#001300',
    },

    red: {
        7: '#d32f2f',
        8: '#c62828',
    }
};

export const theme = {
    bg: palette.bg,
    textMain: palette.beige[8],
    textMuted: palette.beige[5],

    cardOperandBg: palette.beige[1],
    cardResultBg: palette.beige[2],

    ellipseLargeStroke: palette.beige[0],
    ellipseSmallStroke: palette.beige[1],

    operatorCircleBg: palette.beige[1],
    inverseCircleBg: palette.beige[0],

    shadowCard: '0px 4px 8px rgba(0, 0, 0, 0.5)',
};

export function getOperationTheme(mode: 'addsub' | 'multdiv') {
    if (mode === 'addsub') {
        return {
            textOperand: palette.blue[7],
            textResult: palette.blue[8],
            logoMath: palette.blue[3],
            logoFlash: palette.blue[6],
            tagline: palette.blue[5],
            btnBg: palette.blue[7]
        };
    } else {
        return {
            textOperand: palette.green[7],
            textResult: palette.green[8],
            logoMath: palette.green[3],
            logoFlash: palette.green[6],
            tagline: palette.green[5],
            btnBg: palette.green[7]
        };
    }
}
