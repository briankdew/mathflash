import { figmaPalette } from './figmaPalette';

export type OperatorIconColors = {
    circleFill: string;
    operatorFill: string;
};

export type OperationTheme = {
    textOperand: string;
    textResult: string;
    logoMath: string;
    logoFlash: string;
    tagline: string;
    btnBg: string;
    btnPressedBg: string;
    prepBackText: {
        ready: string;
        set: string;
        result: string;
    };
    mainOperator: OperatorIconColors;
    secondaryOperator: OperatorIconColors;
    settingsIcon: {
        gear: string;
        primaryCircle: string;
        secondaryCircle: string;
        primarySymbol: string;
        secondarySymbol: string;
    };
    miniKeypadIcon: {
        body: string;
        accent: string;
    };
    miniMicrophoneIcon: {
        shell: string;
        detail: string;
    };
};

const figmaBlue = {
    0: figmaPalette.blue['mf-blue-00'],
    1: figmaPalette.blue['mf-blue-01'],
    2: figmaPalette.blue['mf-blue-02'],
    3: figmaPalette.blue['mf-blue-03'],
    4: figmaPalette.blue['mf-blue-04'],
    5: figmaPalette.blue['mf-blue-05'],
    6: figmaPalette.blue['mf-blue-06'],
    7: figmaPalette.blue['mf-blue-07'],
    8: figmaPalette.blue['mf-blue-08'],
    9: figmaPalette.blue['mf-blue-09'],
    10: figmaPalette.blue['mf-blue-10'],
    11: figmaPalette.blue['mf-blue-11'],
} as const;

const figmaGreen = {
    0: figmaPalette.green['mf-green-00'],
    1: figmaPalette.green['mf-green-01'],
    2: figmaPalette.green['mf-green-02'],
    3: figmaPalette.green['mf-green-03'],
    4: figmaPalette.green['mf-green-04'],
    5: figmaPalette.green['mf-green-05'],
    6: figmaPalette.green['mf-green-06'],
    7: figmaPalette.green['mf-green-07'],
    8: figmaPalette.green['mf-green-08'],
    9: figmaPalette.green['mf-green-09'],
    10: figmaPalette.green['mf-green-10'],
    11: figmaPalette.green['mf-green-11'],
} as const;

const figmaBeige = {
    0: figmaPalette.beige['mf-beige-00'],
    1: figmaPalette.beige['mf-beige-01'],
    2: figmaPalette.beige['mf-beige-02'],
    3: figmaPalette.beige['mf-beige-03'],
    4: figmaPalette.beige['mf-beige-04'],
    5: figmaPalette.beige['mf-beige-05'],
    6: figmaPalette.beige['mf-beige-06'],
    7: figmaPalette.beige['mf-beige-07'],
    8: figmaPalette.beige['mf-beige-08'],
    9: figmaPalette.beige['mf-beige-09'],
    10: figmaPalette.beige['mf-beige-10'],
    11: figmaPalette.beige['mf-beige-11'],
} as const;

const figmaRed = {
    0: figmaPalette.red['mf-red-00'],
    1: figmaPalette.red['mf-red-01'],
    2: figmaPalette.red['mf-red-02'],
    3: figmaPalette.red['mf-red-03'],
    4: figmaPalette.red['mf-red-04'],
    5: figmaPalette.red['mf-red-05'],
    6: figmaPalette.red['mf-red-06'],
    7: figmaPalette.red['mf-red-07'],
    8: figmaPalette.red['mf-red-08'],
    9: figmaPalette.red['mf-red-09'],
    10: figmaPalette.red['mf-red-10'],
    11: figmaPalette.red['mf-red-11'],
} as const;

const figmaGray = {
    0: figmaPalette.gray['mf-gray-00'],
    1: figmaPalette.gray['mf-gray-01'],
    2: figmaPalette.gray['mf-gray-02'],
    3: figmaPalette.gray['mf-gray-03'],
    4: figmaPalette.gray['mf-gray-04'],
    5: figmaPalette.gray['mf-gray-05'],
    6: figmaPalette.gray['mf-gray-06'],
    7: figmaPalette.gray['mf-gray-07'],
    8: figmaPalette.gray['mf-gray-08'],
    9: figmaPalette.gray['mf-gray-09'],
    10: figmaPalette.gray['mf-gray-10'],
    11: figmaPalette.gray['mf-gray-11'],
} as const;

const figmaStatus = {
    green: figmaPalette.status['mf-status-green-00'],
    yellow: figmaPalette.status['mf-status-yellow-00'],
    red: figmaPalette.status['mf-status-red-00'],
} as const;

export const palette = {
    white: '#ffffff',
    bg: figmaBeige[0],

    beige: figmaBeige,

    blue: figmaBlue,

    green: figmaGreen,

    gray: figmaGray,

    red: figmaRed,

    status: figmaStatus,
};

export const theme = {
    bg: palette.bg,
    textMain: palette.beige[9],
    textMuted: palette.beige[6],

    cardOperandBg: palette.beige[2],
    cardResultBg: palette.beige[3],

    ellipseLargeStroke: palette.beige[1],
    ellipseSmallStroke: palette.beige[2],

    operatorCircleBg: palette.beige[2],
    inverseCircleBg: palette.beige[1],
    dangerSurface: palette.red[2],
    dangerText: palette.red[8],
    dangerAccent: palette.red[7],
    statusListening: palette.status.green,
    statusRetrying: palette.status.yellow,
    statusError: palette.status.red,
    floorLine: palette.red[6],

    shadowCard: '0px 4px 8px rgba(0, 0, 0, 0.5)',
};

const operationThemes: Record<'addsub' | 'multdiv', OperationTheme> = {
    addsub: {
        textOperand: palette.blue[8],
        textResult: palette.blue[9],
        logoMath: palette.blue[4],
        logoFlash: palette.blue[7],
        tagline: palette.blue[6],
        btnBg: palette.blue[8],
        btnPressedBg: palette.blue[9],
        prepBackText: {
            ready: palette.blue[4],
            set: palette.blue[6],
            result: palette.blue[8],
        },
        mainOperator: {
            circleFill: palette.blue[4],
            operatorFill: palette.blue[2],
        },
        secondaryOperator: {
            circleFill: palette.blue[2],
            operatorFill: palette.blue[5],
        },
        settingsIcon: {
            gear: palette.blue[6],
            primaryCircle: palette.blue[4],
            secondaryCircle: palette.blue[2],
            primarySymbol: palette.blue[2],
            secondarySymbol: palette.blue[5],
        },
        miniKeypadIcon: {
            body: palette.blue[6],
            accent: palette.blue[4],
        },
        miniMicrophoneIcon: {
            shell: palette.blue[6],
            detail: palette.blue[4],
        },
    },
    multdiv: {
        textOperand: palette.green[8],
        textResult: palette.green[9],
        logoMath: palette.green[4],
        logoFlash: palette.green[7],
        tagline: palette.green[5],
        btnBg: palette.green[8],
        btnPressedBg: palette.green[9],
        prepBackText: {
            ready: palette.green[4],
            set: palette.green[7],
            result: palette.green[8],
        },
        mainOperator: {
            circleFill: palette.green[4],
            operatorFill: palette.green[2],
        },
        secondaryOperator: {
            circleFill: palette.green[2],
            operatorFill: palette.green[5],
        },
        settingsIcon: {
            gear: palette.green[7],
            primaryCircle: palette.green[4],
            secondaryCircle: palette.green[2],
            primarySymbol: palette.green[2],
            secondarySymbol: palette.green[5],
        },
        miniKeypadIcon: {
            body: palette.green[6],
            accent: palette.green[4],
        },
        miniMicrophoneIcon: {
            shell: palette.green[6],
            detail: palette.green[4],
        },
    },
};

export function getOperationTheme(mode: 'addsub' | 'multdiv'): OperationTheme {
    return operationThemes[mode];
}
