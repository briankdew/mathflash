import React from 'react';
import Svg, { Path, Defs, Filter, G, FeFlood, FeGaussianBlur, FeOffset, FeComposite, Rect } from 'react-native-svg';

type OperatorIconProps = {
    circleFill?: string;
    operatorFill?: string;
};

export const IconPlus = ({ circleFill = '#85a8cd', operatorFill = '#c7daef' }: OperatorIconProps) => (
    <Svg width={45} height={45} viewBox="0 0 7.36 7.36">
        <Path d="m3.68 0a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill={circleFill} />
        <Path d="m3.68 0.82c-0.32353 0-0.5858 0.26227-0.5858 0.58579v1.6876h-1.6876c-0.32352 0-0.58578 0.26227-0.58578 0.58578 0 0.32352 0.26226 0.58579 0.58578 0.58579h1.6876v1.6876c0 0.32352 0.26227 0.58579 0.5858 0.58579 0.32352 0 0.58579-0.26227 0.58579-0.58579v-1.6876h1.6876c0.32353 0 0.58579-0.26227 0.58579-0.58579 0-0.32351-0.26226-0.58578-0.58579-0.58578h-1.6876v-1.6876c0-0.32352-0.26227-0.58579-0.58579-0.58579z" fill={operatorFill} strokeLinejoin="round" strokeMiterlimit="0" strokeWidth="0.01973" />
    </Svg>
);

export const IconTimes = ({ circleFill = '#91ae85', operatorFill = '#cdddc6' }: OperatorIconProps) => (
    <Svg width={45} height={45} viewBox="0 0 7.36 7.36">
        <Path d="m3.68 0a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill={circleFill} />
        <Path d="m5.68 1.68a0.54503 0.54503 0 0 0-0.77078 0l-1.2296 1.2296-1.2296-1.2296a0.54503 0.54503 0 0 0-0.77079 0 0.54503 0.54503 0 0 0 0 0.77079l1.2296 1.2296-1.2296 1.2296a0.54503 0.54503 0 0 0 0 0.77078 0.54503 0.54503 0 0 0 0.77079 0l1.2296-1.2296 1.2296 1.2296a0.54503 0.54503 0 0 0 0.77078 0 0.54503 0.54503 0 0 0 0-0.77078l-1.2296-1.2296 1.2296-1.2296a0.54503 0.54503 0 0 0 0-0.77079z" fill={operatorFill} strokeLinejoin="round" strokeMiterlimit="0" strokeWidth="0.018357" />
    </Svg>
);

export const IconMinus = ({ circleFill = '#c7daef', operatorFill = '#6b90b6' }: OperatorIconProps) => (
    <Svg width={45} height={45} viewBox="0 0 7.36 7.36">
        <Path d="m3.68 0a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill={circleFill} />
        <Path d="m1.55 3.01a0.672 0.672 0 0 0-0.672 0.672 0.672 0.672 0 0 0 0.672 0.672h4.256a0.672 0.672 0 0 0 0.672-0.672 0.672 0.672 0 0 0-0.672-0.672z" fill={operatorFill} />
    </Svg>
);

export const IconDivide = ({ circleFill = '#cdddc6', operatorFill = '#79966c' }: OperatorIconProps) => (
    <Svg width={45} height={45} viewBox="0 0 7.36 7.36">
        <Path d="m3.68 0a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill={circleFill} />
        <Path d="m1.41 3.08a0.59449 0.59449 0 0 0-0.59449 0.59449 0.59449 0.59449 0 0 0 0.59449 0.59449h4.5294a0.59449 0.59449 0 0 0 0.59449-0.59449 0.59449 0.59449 0 0 0-0.59449-0.59449zm2.8342 2.3419a0.60864 0.60864 0 0 1-0.60865 0.60865 0.60864 0.60864 0 0 1-0.60863-0.60865 0.60864 0 0 1 0.60863-0.60864 0.60864 0 0 1 0.60865 0.60864zm0.0783-3.4948a0.60864 0.60864 0 0 1-0.60863 0.60863 0.60864 0.60864 0 0 1-0.60865-0.60863 0.60864 0 0 1 0.60865-0.60865 0.60864 0 0 1 0.60863 0.60865z" fill={operatorFill} />
    </Svg>
);

export const IconAudioMicrophone = ({
    width = 22,
    shellFill = '#777565',
    detailFill = '#f4f2e7',
}: {
    width?: number;
    shellFill?: string;
    detailFill?: string;
}) => (
    <Svg width={width} height={width * (16.14 / 10.055)} viewBox="0 0 10.055 16.14">
        <Path
            d="m5.027 0a3.7042 3.7042 0 0 0-3.7042 3.7042v4.7625a3.7042 3.7042 0 0 0 3.7042 3.7042 3.7042 3.7042 0 0 0 3.7042-3.7042v-4.7625a3.7042 3.7042 0 0 0-3.7042-3.7042z"
            fill={shellFill}
        />
        <Path
            d="m5.027 1.33a2.3813 2.3813 0 0 0-2.3812 2.3812v4.7625a2.3813 2.3813 0 0 0 2.3812 2.3812 2.3813 2.3813 0 0 0 2.3813-2.3812v-4.7625a2.3813 2.3813 0 0 0-2.3813-2.3812zm-4.3574 6.4776a0.66146 0.66146 0 0 0-0.66973 0.65319c-0.02427 1.9168 1.1178 3.7231 2.8469 4.5382 0.37998 0.18732 0.77965 0.32108 1.188 0.40308v1.4216h-1.8593a0.66146 0.66146 0 0 0-0.66146 0.66145 0.66146 0.66146 0 0 0 0.66146 0.66146h5.7128a0.66152 0.66152 0 0 0 0-1.3229h-1.8691v-1.4227c0.82249-0.16464 1.6056-0.53334 2.2546-1.095 1.1259-0.94394 1.7908-2.3693 1.7803-3.8416a0.66146 0.66146 0 0 0-0.66611-0.6568 0.66146 0.66146 0 0 0-0.65681 0.66611c0.0076 1.0621-0.49484 2.141-1.311 2.8231a0.66152 0.66152 0 0 0-0.0093 8e-3c-1.0588 0.91791-2.7266 1.1284-3.9832 0.50695a0.66152 0.66152 0 0 0-0.01189-6e-3c-1.2399-0.58201-2.1102-1.9597-2.0929-3.328a0.66146 0.66146 0 0 0-0.65319-0.66971z"
            fill={detailFill}
        />
    </Svg>
);

export const IconVoiceInputMicrophone = ({
    width = 330,
    haloFill = '#f4f2e7',
}: {
    width?: number;
    haloFill?: string;
}) => (
    <Svg width={width} height={width * (240 / 330)} viewBox="0 0 330 240">
        <Defs>
            <Filter id="filterVoiceInputMicShell" x="-0.042588" y="-0.025923" width="1.0852" height="1.0626">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".50196" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.5" />
                <FeOffset dx="0" dy="0.5" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="out" result="comp1" />
                <FeComposite in="comp1" in2="SourceGraphic" operator="atop" result="comp2" />
            </Filter>
            <Filter id="filterVoiceInputMicDetail" x="-0.03138" y="-0.021304" width="1.0628" height="1.0515">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".50196" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.5" />
                <FeOffset dx="0" dy="0.5" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G transform="matrix(3.7794 0 0 3.7794 -165.26 -469.97)">
            <G filter="url(#filterVoiceInputMicShell)">
                <Path
                    d="m87.383 124.35c-7.7808 0-14.088 6.3076-14.088 14.088v18.114c5e-6 7.7809 6.3076 14.088 14.088 14.088 7.7808 0 14.088-6.3076 14.088-14.088v-18.114c0-7.7809-6.3076-14.088-14.088-14.088z"
                    fill={haloFill}
                    strokeWidth="3.8034"
                />
            </G>
            <G filter="url(#filterVoiceInputMicDetail)">
                <Path
                    d="m70.812 154.06c-1.3894-0.019-2.5299 1.0948-2.5472 2.4843-0.09231 7.2902 4.2513 14.16 10.828 17.26 1.4452 0.71244 2.9652 1.2212 4.5183 1.533v5.3648h-7.0715c-1.3894 0-2.5157 1.1263-2.5157 2.5157 0 1.3894 1.1263 2.5157 2.5157 2.5157h21.727c3.3058-0.0479 3.3058-4.9833 0-5.0314h-7.1087v-5.369c3.1282-0.62617 6.1066-2.0284 8.5749-4.1646 4.2821-3.5901 6.8109-9.0111 6.771-14.611-0.01-1.3894-1.144-2.5078-2.5334-2.498-1.3894 0.0114-2.5078 1.144-2.498 2.5334 0.0289 4.0395-1.882 8.1428-4.9861 10.737-0.0118 0.0114-0.0236 0.019-0.0354 0.0304-4.0269 3.4911-10.37 4.2916-15.149 1.9281-0.01483-8e-3 -0.03005-0.0152-0.04522-0.0228-4.7157-2.2136-8.0257-7.4533-7.9599-12.657 0.0175-1.3894-1.0949-2.5298-2.4843-2.5471z"
                    fill="#a7a597"
                    strokeWidth="3.8033"
                />
                <Path
                    d="m87.383 129.41a9.0571 9.0571 0 0 0-9.0567 9.0567v18.114a9.0571 9.0571 0 0 0 9.0567 9.0567 9.0571 9.0571 0 0 0 9.0571-9.0567v-18.114a9.0571 9.0571 0 0 0-9.0571-9.0567z"
                    fill="#c0beb1"
                    strokeWidth="3.8034"
                />
            </G>
        </G>
    </Svg>
);

type MiniToggleIconProps = {
    size?: number;
};

export const IconMiniKeypadAddSub = ({ size = 40 }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
            <Filter id="filterMiniKeypadAddSub" x="-0.029639" y="-0.030277" width="1.0593" height="1.1221">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.41" />
                <FeOffset dx="0" dy="2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G transform="translate(1.7193 .53)" filter="url(#filterMiniKeypadAddSub)">
            <G transform="translate(.9607 2.5)" fill="#53789e">
                <Rect x="23.52" y="26.22" width="10.4" height="7" rx="2" ry="2" fill="#85a8cd" />
                <Rect x=".72" y="26.22" width="21.8" height="7" rx="2" ry="2" />
                <Rect x=".72" y=".72" width="10.4" height="7" rx="2" ry="2" />
                <Rect x="12.12" y=".72" width="10.4" height="7" rx="2" ry="2" />
                <Rect x="23.52" y=".72" width="10.4" height="7" rx="2" ry="2" />
                <Rect x=".72" y="9.22" width="10.4" height="7" rx="2" ry="2" />
                <Rect x="12.12" y="9.22" width="10.4" height="7" rx="2" ry="2" />
                <Rect x="23.52" y="9.22" width="10.4" height="7" rx="2" ry="2" />
                <Rect x=".72" y="17.72" width="10.4" height="7" rx="2" ry="2" />
                <Rect x="12.12" y="17.72" width="10.4" height="7" rx="2" ry="2" />
                <Rect x="23.52" y="17.72" width="10.4" height="7" rx="2" ry="2" />
            </G>
        </G>
    </Svg>
);

export const IconMiniKeypadMulDiv = ({ size = 40 }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
            <Filter id="filterMiniKeypadMulDiv" x="-0.029639" y="-0.030277" width="1.0593" height="1.1221">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.41" />
                <FeOffset dx="0" dy="2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G transform="translate(.8033 -.736)" filter="url(#filterMiniKeypadMulDiv)">
            <G transform="translate(2.416 3.516)">
                <Rect x="22.981" y="26.47" width="10.4" height="7" rx="2" ry="2" fill="#91ae85" />
                <G fill="#607f53">
                    <Rect x=".1807" y="26.47" width="21.8" height="7" rx="2" ry="2" />
                    <Rect x=".1807" y=".97" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x="11.581" y=".97" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x="22.981" y=".97" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x=".1807" y="9.47" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x="11.581" y="9.47" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x="22.981" y="9.47" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x=".1807" y="17.97" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x="11.581" y="17.97" width="10.4" height="7" rx="2" ry="2" />
                    <Rect x="22.981" y="17.97" width="10.4" height="7" rx="2" ry="2" />
                </G>
            </G>
        </G>
    </Svg>
);

export const IconMiniMicrophoneAddSub = ({ size = 40 }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 10.584 10.584">
        <Defs>
            <Filter id="filterMiniMicrophoneAddSub" x="-0.061701" y="-0.041864" width="1.1234" height="1.1419">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.15" />
                <FeOffset dx="0" dy="0.5" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G filter="url(#filterMiniMicrophoneAddSub)">
            <G transform="translate(-64.565 -124.69)" strokeWidth=".58028">
                <Path
                    d="m67.329 129.44c-0.21199-3e-3 -0.386 0.16705-0.38863 0.37904-0.01408 1.1123 0.64864 2.1604 1.652 2.6334 0.2205 0.1087 0.45242 0.18632 0.68938 0.2339v0.82494h-1.0789c-0.21198 0-0.38383 0.17184-0.38384 0.38382-3e-6 0.21199 0.17185 0.38384 0.38384 0.38384h3.315c0.50448-7e-3 0.50448-0.76042 0-0.76766h-1.0846v-0.82557c0.47728-0.0955 0.9317-0.30949 1.3083-0.63541 0.65334-0.54775 1.0392-1.3749 1.0331-2.2292-0.0015-0.21199-0.17455-0.38263-0.38653-0.38113-0.21199 1e-3 -0.38263 0.17454-0.38114 0.38653 0.0044 0.61632-0.28715 1.2424-0.76075 1.6382-0.0018 2e-3 -0.0036 3e-3 -0.0054 5e-3 -0.6144 0.53265-1.5822 0.6548-2.3114 0.29418l-0.0069-3e-3c-0.71949-0.33773-1.2245-1.1372-1.2145-1.9312 0.0027-0.21199-0.16705-0.38599-0.37904-0.38862z"
                    fill="#53789e"
                />
                <Path
                    d="m69.857 125.68a1.3818 1.3818 0 0 0-1.3818 1.3818v2.7636a1.3818 1.3818 0 0 0 1.3818 1.3818 1.3818 1.3818 0 0 0 1.3818-1.3818v-2.7636a1.3818 1.3818 0 0 0-1.3818-1.3818z"
                    fill="#85a8cd"
                />
            </G>
        </G>
    </Svg>
);

export const IconMiniMicrophoneMulDiv = ({ size = 40 }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 10.584 10.584">
        <Defs>
            <Filter id="filterMiniMicrophoneMulDiv" x="-0.061701" y="-0.041866" width="1.1234" height="1.1419">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.15" />
                <FeOffset dx="0" dy="0.5" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G filter="url(#filterMiniMicrophoneMulDiv)">
            <G transform="translate(-64.565 -124.69)" strokeWidth=".58028">
                <Path
                    d="m67.329 129.44a0.38383 0.38383 0 0 0-0.38863 0.37904c-0.01408 1.1123 0.64864 2.1604 1.652 2.6334 0.2205 0.1087 0.45242 0.18632 0.68938 0.2339v0.82494h-1.0789a0.38383 0.38383 0 0 0-0.38384 0.38382 0.38383 0.38383 0 0 0 0.38384 0.38384h3.315a0.38387 0.38387 0 0 0 0-0.76766h-1.0846v-0.82557c0.47728-0.0955 0.9317-0.30949 1.3083-0.63541 0.65334-0.54775 1.0392-1.3749 1.0331-2.2292a0.38383 0.38383 0 0 0-0.38653-0.38113 0.38383 0.38383 0 0 0-0.38114 0.38653c0.0044 0.61632-0.28715 1.2424-0.76075 1.6382a0.38387 0.38387 0 0 0-0.0054 5e-3c-0.6144 0.53265-1.5822 0.6548-2.3114 0.29418a0.38387 0.38387 0 0 0-0.0069-3e-3c-0.71949-0.33773-1.2245-1.1372-1.2145-1.9312a0.38383 0.38383 0 0 0-0.37904-0.38862z"
                    fill="#607f53"
                />
                <Path
                    d="m69.857 125.68a1.3818 1.3818 0 0 0-1.3818 1.3818v2.7636a1.3818 1.3818 0 0 0 1.3818 1.3818 1.3818 1.3818 0 0 0 1.3818-1.3818v-2.7636a1.3818 1.3818 0 0 0-1.3818-1.3818z"
                    fill="#91ae85"
                />
            </G>
        </G>
    </Svg>
);

export const IconInputModeToggle = ({
    size = 40,
    operation,
    inputMode,
}: {
    size?: number;
    operation: 'addsub' | 'multdiv';
    inputMode: 'keypad' | 'voice';
}) => {
    if (inputMode === 'voice') {
        return operation === 'addsub'
            ? <IconMiniMicrophoneAddSub size={size} />
            : <IconMiniMicrophoneMulDiv size={size} />;
    }

    return operation === 'addsub'
        ? <IconMiniKeypadAddSub size={size} />
        : <IconMiniKeypadMulDiv size={size} />;
};

export const IconSettingsAddSub = ({ size = 35 }: { size?: number }) => (
    <Svg width={size * (58 / 40)} height={size} viewBox="0 0 15.346 10.584">
        <Defs>
            <Filter id="filterSettingsAddSubGear" x="-0.051834" y="-0.051834" width="1.1037" height="1.1253">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.83" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
            <Filter id="filterSettingsAddSubMinus" x="-0.065217" y="-0.065217" width="1.1304" height="1.1576">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.83" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
            <Filter id="filterSettingsAddSubPlus" x="-0.065217" y="-0.065217" width="1.1304" height="1.1576">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.83" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G transform="matrix(1 0 0 1 .39681 .56147)">
            <Path
                d="m8.7088 5.2237a1.5509 1.5509 0 0 1-2.0263 0.83934 1.5509 1.5509 0 0 1-0.83934-2.0263 1.5509 1.5509 0 0 1 2.0263-0.83934 1.5509 1.5509 0 0 1 0.83934 2.0263zm0.38722-4.9874-0.30901-0.12712c-0.52469-0.21569-0.56771-0.13016-0.88701 0.42265l-0.28814 0.49862a3.6187 3.6187 0 0 0-0.66856 0.0053l-0.29119-0.50396c-0.31932-0.55281-0.36241-0.63822-0.88708-0.42253l-0.30906 0.12698-0.30833 0.12874c-0.52353 0.21849-0.4936 0.30936-0.3285 0.92605l0.15047 0.56228a3.6187 3.6187 0 0 0-0.47651 0.46898l-0.55632-0.14884c-0.61669-0.1651-0.70759-0.19517-0.92605 0.32837l-0.12861 0.30839-0.12712 0.30901c-0.21567 0.5247-0.13016 0.5677 0.42265 0.88701l0.49863 0.28813a3.6187 3.6187 0 0 0 0.0053 0.66856l-0.50399 0.29119c-0.55281 0.31932-0.63822 0.36241-0.42253 0.88708l0.12698 0.30906 0.12874 0.30833c0.21849 0.52353 0.30936 0.4936 0.92605 0.3285l0.56228-0.15047a3.6187 3.6187 0 0 0 0.46898 0.47651l-0.14883 0.55633c-0.1651 0.61669-0.19517 0.70759 0.32837 0.92605l0.30839 0.12861 0.30901 0.12712c0.5247 0.21567 0.56771 0.13016 0.88701-0.42265l0.28814-0.49862a3.6187 3.6187 0 0 0 0.66856-0.00532l0.29119 0.50399c0.31932 0.55281 0.36241 0.63822 0.88708 0.42253l0.30906-0.12698 0.30833-0.12874c0.52353-0.21849 0.4936-0.30936 0.3285-0.92605l-0.15047-0.56228a3.6187 3.6187 0 0 0 0.47651-0.46898l0.55632 0.14884c0.61669 0.1651 0.70758 0.19516 0.92605-0.32837l0.12861-0.30839 0.12712-0.30901c0.21567-0.5247 0.13016-0.56771-0.42265-0.88701l-0.4958-0.28653a3.6187 3.6187 0 0 0-1.58e-4 -0.67472l0.49598-0.28664c0.55281-0.31932 0.63822-0.36241 0.42253-0.88708l-0.12696-0.30906-0.12874-0.30833c-0.21849-0.52353-0.30936-0.4936-0.92605-0.3285l-0.5534 0.14803a3.6187 3.6187 0 0 0-0.477-0.4772l0.14798-0.55318c0.1651-0.61669 0.19516-0.70759-0.32837-0.92605z"
                fill="#3a6187"
                filter="url(#filterSettingsAddSubGear)"
                strokeLinejoin="round"
                strokeMiterlimit="0"
                strokeWidth=".064633"
            />
            <G transform="translate(-10.635 -13.87)">
                <Path transform="matrix(.71898 0 0 .71898 19.896 17.839)" d="m3.68 0a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill="#c7daef" filter="url(#filterSettingsAddSubMinus)" />
                <Path transform="matrix(.71898 0 0 .71898 19.844 17.727)" d="m1.55 3.01a0.672 0.672 0 0 0-0.672 0.672 0.672 0.672 0 0 0 0.672 0.672h4.256a0.672 0.672 0 0 0 0.672-0.672 0.672 0.672 0 0 0-0.672-0.672z" fill="#6b90b6" />
            </G>
            <G transform="matrix(.71898 0 0 .71898 -.051462 3.8563)">
                <Path d="m3.7515 0.1564a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill="#85a8cd" filter="url(#filterSettingsAddSubPlus)" />
                <Path transform="translate(-3.8517e-4,3.8543e-4)" d="m3.68 0.82c-0.32353 0-0.5858 0.26227-0.5858 0.58579v1.6876h-1.6876c-0.32352 0-0.58578 0.26227-0.58578 0.58578 0 0.32352 0.26226 0.58579 0.58578 0.58579h1.6876v1.6876c0 0.32352 0.26227 0.58579 0.5858 0.58579 0.32352 0 0.58579-0.26227 0.58579-0.58579v-1.6876h1.6876c0.32353 0 0.58579-0.26227 0.58579-0.58579 0-0.32351-0.26226-0.58578-0.58579-0.58578h-1.6876v-1.6876c0-0.32352-0.26227-0.58579-0.58579-0.58579z" fill="#c7daef" strokeLinejoin="round" strokeMiterlimit="0" strokeWidth=".01973" />
            </G>
        </G>
    </Svg>
);

export const IconSettingsMulDiv = ({ size = 35 }: { size?: number }) => (
    <Svg width={size * (58 / 40)} height={size} viewBox="0 0 15.346 10.583">
        <Defs>
            <Filter id="filterSettingsMulDivGear" x="-0.051834" y="-0.051834" width="1.1037" height="1.1253">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.83" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
            <Filter id="filterSettingsMulDivDivide" x="-0.065217" y="-0.065217" width="1.1304" height="1.1576">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.83" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
            <Filter id="filterSettingsMulDivTimes" x="-0.065217" y="-0.065217" width="1.1304" height="1.1576">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.83" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G transform="translate(.39685 .56146)">
            <Path
                d="m8.7088 5.2237a1.5509 1.5509 0 0 1-2.0263 0.83934 1.5509 1.5509 0 0 1-0.83934-2.0263 1.5509 1.5509 0 0 1 2.0263-0.83934 1.5509 1.5509 0 0 1 0.83934 2.0263zm0.38722-4.9874-0.30901-0.12712c-0.52469-0.21569-0.56771-0.13016-0.88701 0.42265l-0.28814 0.49862a3.6187 3.6187 0 0 0-0.66856 0.0053l-0.29119-0.50396c-0.31932-0.55281-0.36241-0.63822-0.88708-0.42253l-0.30906 0.12698-0.30833 0.12874c-0.52353 0.21849-0.4936 0.30936-0.3285 0.92605l0.15047 0.56228a3.6187 3.6187 0 0 0-0.47651 0.46898l-0.55632-0.14884c-0.61669-0.1651-0.70759-0.19517-0.92605 0.32837l-0.12861 0.30839-0.12712 0.30901c-0.21567 0.5247-0.13016 0.5677 0.42265 0.88701l0.49863 0.28813a3.6187 3.6187 0 0 0 0.0053 0.66856l-0.50399 0.29119c-0.55281 0.31932-0.63822 0.36241-0.42253 0.88708l0.12698 0.30906 0.12874 0.30833c0.21849 0.52353 0.30936 0.4936 0.92605 0.3285l0.56228-0.15047a3.6187 3.6187 0 0 0 0.46898 0.47651l-0.14883 0.55633c-0.1651 0.61669-0.19517 0.70759 0.32837 0.92605l0.30839 0.12861 0.30901 0.12712c0.5247 0.21567 0.56771 0.13016 0.88701-0.42265l0.28814-0.49862a3.6187 3.6187 0 0 0 0.66856-0.00532l0.29119 0.50399c0.31932 0.55281 0.36241 0.63822 0.88708 0.42253l0.30906-0.12698 0.30833-0.12874c0.52353-0.21849 0.4936-0.30936 0.3285-0.92605l-0.15047-0.56228a3.6187 3.6187 0 0 0 0.47651-0.46898l0.55632 0.14884c0.61669 0.1651 0.70758 0.19516 0.92605-0.32837l0.12861-0.30839 0.12712-0.30901c0.21567-0.5247 0.13016-0.56771-0.42265-0.88701l-0.4958-0.28653a3.6187 3.6187 0 0 0-1.58e-4 -0.67472l0.49598-0.28664c0.55281-0.31932 0.63822-0.36241 0.42253-0.88708l-0.12696-0.30906-0.12874-0.30833c-0.21849-0.52353-0.30936-0.4936-0.92605-0.3285l-0.5534 0.14803a3.6187 3.6187 0 0 0-0.477-0.4772l0.14798-0.55318c0.1651-0.61669 0.19516-0.70759-0.32837-0.92605z"
                fill="#49683b"
                filter="url(#filterSettingsMulDivGear)"
                strokeLinejoin="round"
                strokeMiterlimit="0"
                strokeWidth=".064633"
            />
            <G transform="matrix(.71898 0 0 .71898 9.2604 3.9687)">
                <Path d="m3.68 0a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill="#cdddc6" filter="url(#filterSettingsMulDivDivide)" />
                <Path d="m1.41 3.08a0.59449 0.59449 0 0 0-0.59449 0.59449 0.59449 0.59449 0 0 0 0.59449 0.59449h4.5294a0.59449 0.59449 0 0 0 0.59449-0.59449 0.59449 0.59449 0 0 0-0.59449-0.59449zm2.8342 2.3419a0.60864 0.60864 0 0 1-0.60865 0.60865 0.60864 0.60864 0 0 1-0.60863-0.60865 0.60864 0.60864 0 0 1 0.60863-0.60864 0.60864 0.60864 0 0 1 0.60865 0.60864zm0.0783-3.4948a0.60864 0.60864 0 0 1-0.60863 0.60863 0.60864 0.60864 0 0 1-0.60865-0.60863 0.60864 0.60864 0 0 1 0.60865-0.60865 0.60864 0.60864 0 0 1 0.60863 0.60865z" fill="#79966c" />
            </G>
            <G transform="matrix(.71898 0 0 .71898 .00025867 3.9685)">
                <Path d="m3.6796 5e-4a3.68 3.68 0 0 0-3.68 3.68 3.68 3.68 0 0 0 3.68 3.68 3.68 3.68 0 0 0 3.68-3.68 3.68 3.68 0 0 0-3.68-3.68z" fill="#91ae85" filter="url(#filterSettingsMulDivTimes)" />
                <Path d="m5.68 1.68a0.54503 0.54503 0 0 0-0.77078 0l-1.2296 1.2296-1.2296-1.2296a0.54503 0.54503 0 0 0-0.77079 0 0.54503 0.54503 0 0 0 0 0.77079l1.2296 1.2296-1.2296 1.2296a0.54503 0.54503 0 0 0 0 0.77078 0.54503 0.54503 0 0 0 0.77079 0l1.2296-1.2296 1.2296 1.2296a0.54503 0.54503 0 0 0 0.77078 0 0.54503 0.54503 0 0 0 0-0.77078l-1.2296-1.2296 1.2296-1.2296a0.54503 0.54503 0 0 0 0-0.77079z" fill="#cdddc6" strokeLinejoin="round" strokeMiterlimit="0" strokeWidth=".018357" />
            </G>
        </G>
    </Svg>
);
