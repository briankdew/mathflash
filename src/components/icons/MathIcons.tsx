import React from 'react';
import Svg, { Path, Defs, Filter, G, FeFlood, FeGaussianBlur, FeOffset, FeComposite, Rect, Circle, Image as SvgImage } from 'react-native-svg';

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
    <Svg width={width} height={width * (241 / 330)} viewBox="0 0 330 241">
        <Path
            d="m165-9.0305e-5c-29.409 0-53.25 23.841-53.25 53.25v68.5c0 30.085 24.673 53.249 53.25 53.249 28.577 0 53.25-23.164 53.25-53.249v-68.5c0-29.409-23.841-53.25-53.25-53.25z"
            fill={haloFill}
        />
        <SvgImage
            x={86.75}
            y={-6.0001}
            width={156.5}
            height={247}
            href={require('../../../assets/voice-input-mic-shadows.png')}
            preserveAspectRatio="none"
        />
        <Path
            d="m165 19a34.25 34.25 0 0 0-34.25 34.25v68.5a34.25 34.25 0 0 0 17.125 29.662 34.25 34.25 0 0 0 34.25 0 34.25 34.25 0 0 0 17.125-29.662v-68.5a34.25 34.25 0 0 0-34.25-34.25z"
            fill="#c0beb1"
            stroke="#c0beb1"
        />
        <Path
            d="m102.25 112.25c-5.2467 0-9.5 4.2533-9.5 9.5 0 25.797 13.784 49.672 36.125 62.57 6.972 4.0253 14.453 6.7937 22.125 8.3066v20.373h-27c-5.2467 0-9.5 4.2533-9.5 9.5s4.2533 9.5 9.5 9.5h82c5.2467 0 9.5-4.2533 9.5-9.5s-4.2533-9.5-9.5-9.5h-27v-20.373c7.6724-1.5129 15.153-4.2813 22.125-8.3066 22.341-12.899 36.125-36.773 36.125-62.57 0-5.2467-4.2533-9.5-9.5-9.5s-9.5 4.2533-9.5 9.5c0 30.168-24.743 53.25-53.25 53.25-28.51 0-53.25-23.086-53.25-53.25 0-5.2467-4.2533-9.5-9.5-9.5z"
            fill="#a7a597"
            stroke="#a7a597"
        />
    </Svg>
);

type MiniToggleIconProps = {
    size?: number;
};

const MINI_KEYPAD_ICON_SIZE = 41;
const MINI_MICROPHONE_ICON_SIZE = 43;

export const IconMiniKeypadAddSub = ({ size = MINI_KEYPAD_ICON_SIZE }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 41 41">
        <G transform="translate(1.7193 .53)">
            <G transform="matrix(1.0769 0 0 1.0769 .50532 1.6946)" fill="#53789e">
                <Rect x="23.006" y="26.349" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" fill="#85a8cd" />
                <Rect x=".72" y="26.349" width="21.357" height="6.8714" rx="1.9594" ry="1.9633" />
                <G>
                    <Rect x=".72" y=".72" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    <Rect x="11.863" y=".72" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    <Rect x="23.006" y=".72" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                </G>
                <G>
                    <Rect x=".72" y="9.2629" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    <Rect x="11.863" y="9.2629" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    <Rect x="23.006" y="9.2629" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    <Rect x=".72" y="17.806" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    <Rect x="11.863" y="17.806" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    <Rect x="23.006" y="17.806" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                </G>
            </G>
        </G>
    </Svg>
);

export const IconMiniKeypadMulDiv = ({ size = MINI_KEYPAD_ICON_SIZE }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 41 41">
        <G transform="translate(-38.303 15.423)">
            <G transform="matrix(1.0769 0 0 1.0769 40.528 -13.199)">
                <Rect x="23.006" y="26.349" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" fill="#91ae85" />
                <G fill="#607f53">
                    <Rect x=".72" y="26.349" width="21.357" height="6.8714" rx="1.9594" ry="1.9633" />
                    <G>
                        <Rect x=".72" y=".72" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                        <Rect x="11.863" y=".72" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                        <Rect x="23.006" y=".72" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    </G>
                    <G>
                        <Rect x=".72" y="9.2629" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                        <Rect x="11.863" y="9.2629" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                        <Rect x="23.006" y="9.2629" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                        <Rect x=".72" y="17.806" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                        <Rect x="11.863" y="17.806" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                        <Rect x="23.006" y="17.806" width="10.214" height="6.8714" rx="1.9643" ry="1.9633" />
                    </G>
                </G>
            </G>
        </G>
    </Svg>
);

export const IconMiniMicrophoneAddSub = ({ size = MINI_MICROPHONE_ICON_SIZE }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 43 43">
        <Defs>
            <Filter id="filterMiniMicrophoneAddSub" x="-0.015158" y="-0.010286" width="1.0303" height="1.0349">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.15" />
                <FeOffset dx="0" dy="0.5" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G filter="url(#filterMiniMicrophoneAddSub)">
            <G transform="matrix(4.0703 0 0 4.0703 -262.84 -507.55)" strokeWidth=".5803">
                <Path
                    d="m67.329 129.44c-0.212-3e-3 -0.38602 0.16705-0.38865 0.37904-0.01408 1.1123 0.64868 2.1604 1.6521 2.6334 0.22051 0.1087 0.45245 0.18632 0.68942 0.2339v0.82494h-1.079c-0.21199 0-0.38385 0.17184-0.38386 0.38382-3e-6 0.21199 0.17186 0.38384 0.38386 0.38384h3.3152c0.50451-7e-3 0.50451-0.76042 0-0.76766h-1.0847v-0.82557c0.47731-0.0955 0.93176-0.30949 1.3084-0.63541 0.65338-0.54775 1.0393-1.3749 1.0332-2.2292-0.0015-0.21199-0.17456-0.38263-0.38655-0.38113-0.212 1e-3 -0.38265 0.17454-0.38116 0.38653 0.0044 0.61632-0.28717 1.2424-0.7608 1.6382-0.0018 2e-3 -0.0036 3e-3 -0.0054 5e-3 -0.61444 0.53265-1.5823 0.6548-2.3115 0.29418l-0.0069-3e-3c-0.71954-0.33773-1.2246-1.1372-1.2146-1.9312 0.0027-0.21199-0.16706-0.38599-0.37906-0.38862z"
                    fill="#53789e"
                />
                <Path
                    d="m69.857 125.68a1.3819 1.3818 0 0 0-1.3819 1.3818v2.7636a1.3819 1.3818 0 0 0 1.3819 1.3818 1.3819 1.3818 0 0 0 1.3819-1.3818v-2.7636a1.3819 1.3818 0 0 0-1.3819-1.3818z"
                    fill="#85a8cd"
                />
            </G>
        </G>
    </Svg>
);

export const IconMiniMicrophoneMulDiv = ({ size = MINI_MICROPHONE_ICON_SIZE }: MiniToggleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 43 43">
        <Defs>
            <Filter id="filterMiniMicrophoneMulDiv" x="-0.015158" y="-0.010286" width="1.0303" height="1.0349">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.15" />
                <FeOffset dx="0" dy="0.5" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G filter="url(#filterMiniMicrophoneMulDiv)">
            <G transform="matrix(4.0703 0 0 4.0703 -262.84 -507.55)" strokeWidth=".5803">
                <Path
                    d="m67.329 129.44c-0.212-3e-3 -0.38602 0.16705-0.38865 0.37904-0.01408 1.1123 0.64868 2.1604 1.6521 2.6334 0.22051 0.1087 0.45245 0.18632 0.68942 0.2339v0.82494h-1.079c-0.21199 0-0.38385 0.17184-0.38386 0.38382-3e-6 0.21199 0.17186 0.38384 0.38386 0.38384h3.3152c0.50451-7e-3 0.50451-0.76042 0-0.76766h-1.0847v-0.82557c0.47731-0.0955 0.93176-0.30949 1.3084-0.63541 0.65338-0.54775 1.0393-1.3749 1.0332-2.2292-0.0015-0.21199-0.17456-0.38263-0.38655-0.38113-0.212 1e-3 -0.38265 0.17454-0.38116 0.38653 0.0044 0.61632-0.28717 1.2424-0.7608 1.6382-0.0018 2e-3 -0.0036 3e-3 -0.0054 5e-3 -0.61444 0.53265-1.5823 0.6548-2.3115 0.29418l-0.0069-3e-3c-0.71954-0.33773-1.2246-1.1372-1.2146-1.9312 0.0027-0.21199-0.16706-0.38599-0.37906-0.38862z"
                    fill="#607f53"
                />
                <Path
                    d="m69.857 125.68a1.3819 1.3818 0 0 0-1.3819 1.3818v2.7636a1.3819 1.3818 0 0 0 1.3819 1.3818 1.3819 1.3818 0 0 0 1.3819-1.3818v-2.7636a1.3819 1.3818 0 0 0-1.3819-1.3818z"
                    fill="#91ae85"
                />
            </G>
        </G>
    </Svg>
);

export const IconInputModeToggle = ({
    size,
    operation,
    inputMode,
}: {
    size?: number;
    operation: 'addsub' | 'multdiv';
    inputMode: 'keypad' | 'voice';
}) => {
    if (inputMode === 'voice') {
        return operation === 'addsub'
            ? <IconMiniMicrophoneAddSub size={size ?? MINI_MICROPHONE_ICON_SIZE} />
            : <IconMiniMicrophoneMulDiv size={size ?? MINI_MICROPHONE_ICON_SIZE} />;
    }

    return operation === 'addsub'
        ? <IconMiniKeypadAddSub size={size ?? MINI_KEYPAD_ICON_SIZE} />
        : <IconMiniKeypadMulDiv size={size ?? MINI_KEYPAD_ICON_SIZE} />;
};

export const IconSettingsAddSub = ({ size = 35 }: { size?: number }) => (
    <Svg width={size * (51 / 39)} height={size} viewBox="0 0 51 39">
        <Defs>
            <Filter id="filterSettingsAddSubGear" x="-0.013714" y="-0.013714" width="1.0274" height="1.0331">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.2" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
            <Filter id="filterSettingsAddSubCircles" x="-0.027174" y="-0.065217" width="1.0543" height="1.1576">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.2" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G transform="translate(.39685 .06127)">
            <G filter="url(#filterSettingsAddSubGear)">
                <Path
                    d="m30.518 21.682a5.8616 5.8616 0 0 1-7.6584 3.1723 5.8616 5.8616 0 0 1-3.1723-7.6584 5.8616 5.8616 0 0 1 7.6584-3.1723 5.8616 5.8616 0 0 1 3.1723 7.6584zm1.4635-18.85-1.1679-0.48045c-1.9831-0.8152-2.1457-0.49194-3.3525 1.5974l-1.089 1.8845a13.677 13.677 0 0 0-2.5268 0.020031l-1.1006-1.9047c-1.2069-2.0894-1.3697-2.4122-3.3527-1.597l-1.1681 0.47992-1.1653 0.48657c-1.9787 0.82579-1.8656 1.1692-1.2416 3.5l0.5687 2.1251a13.677 13.677 0 0 0-1.801 1.7725l-2.1026-0.56254c-2.3308-0.624-2.6743-0.73765-3.5 1.2411l-0.48608 1.1656-0.48045 1.1679c-0.81513 1.9831-0.49194 2.1456 1.5974 3.3525l1.8846 1.089a13.677 13.677 0 0 0 0.02003 2.5268l-1.9048 1.1006c-2.0894 1.2069-2.4122 1.3697-1.597 3.3527l0.47992 1.1681 0.48657 1.1653c0.82578 1.9787 1.1692 1.8656 3.5 1.2416l2.1251-0.5687a13.677 13.677 0 0 0 1.7725 1.801l-0.5625 2.1027c-0.624 2.3308-0.73765 2.6743 1.2411 3.5l1.1656 0.48608 1.1679 0.48045c1.9831 0.81513 2.1457 0.49194 3.3525-1.5974l1.089-1.8845a13.677 13.677 0 0 0 2.5268-0.02011l1.1006 1.9048c1.2069 2.0894 1.3697 2.4122 3.3527 1.597l1.1681-0.47992 1.1653-0.48657c1.9787-0.82579 1.8656-1.1692 1.2416-3.5l-0.5687-2.1251a13.677 13.677 0 0 0 1.801-1.7725l2.1026 0.56254c2.3308 0.624 2.6743 0.73761 3.5-1.2411l0.48608-1.1656 0.48045-1.1679c0.81513-1.9831 0.49194-2.1457-1.5974-3.3525l-1.8739-1.0829a13.677 13.677 0 0 0-5.97e-4 -2.5501l1.8746-1.0834c2.0894-1.2069 2.4122-1.3697 1.597-3.3527l-0.47984-1.1681-0.48657-1.1653c-0.82579-1.9787-1.1692-1.8656-3.5-1.2416l-2.0916 0.55948a13.677 13.677 0 0 0-1.8028-1.8036l0.55929-2.0907c0.624-2.3308 0.73761-2.6743-1.2411-3.5z"
                    fill="#53789e"
                    strokeLinejoin="round"
                    strokeMiterlimit="0"
                    strokeWidth=".24428"
                />
            </G>
            <G transform="matrix(2.7174 0 0 2.7174 .0010582 14.999)" filter="url(#filterSettingsAddSubCircles)">
                <Circle cx="14.39" cy="4.3937" r="3.68" fill="#c7daef" />
                <Circle cx="4.0856" cy="4.3938" r="3.68" fill="#85a8cd" />
            </G>
        </G>
        <Path
            d="m11.5 19.231c-0.87911 0-1.5918 0.71265-1.5918 1.5917v4.5856h-4.5856c-0.87908 0-1.5917 0.71265-1.5917 1.5917 0 0.87908 0.71262 1.5917 1.5917 1.5917h4.5856v4.5856c0 0.87908 0.71265 1.5917 1.5918 1.5917 0.87908 0 1.5917-0.71265 1.5917-1.5917v-4.5856h4.5856c0.87911 0 1.5917-0.71265 1.5917-1.5917s-0.71262-1.5917-1.5917-1.5917h-4.5856v-4.5856c0-0.87908-0.71265-1.5917-1.5917-1.5917z"
            fill="#c7daef"
            strokeLinejoin="round"
            strokeMiterlimit="0"
            strokeWidth=".053611"
        />
        <Path
            d="m33.718 25.174a1.826 1.826 0 0 0-1.826 1.826 1.826 1.826 0 0 0 1.826 1.826h11.565a1.826 1.826 0 0 0 1.826-1.826 1.826 1.826 0 0 0-1.826-1.826z"
            fill="#6b90b6"
            strokeWidth="2.7172"
        />
    </Svg>
);

export const IconSettingsMulDiv = ({ size = 35 }: { size?: number }) => (
    <Svg width={size * (51 / 39)} height={size} viewBox="0 0 51 39">
        <Defs>
            <Filter id="filterSettingsMulDivGear" x="-0.013714" y="-0.013714" width="1.0274" height="1.0331">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.2" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
            <Filter id="filterSettingsMulDivCircles" x="-0.027174" y="-0.065216" width="1.0543" height="1.1576">
                <FeFlood floodColor="rgb(0,0,0)" floodOpacity=".25098" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.2" />
                <FeOffset dx="0" dy="0.2" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="in" result="comp1" />
                <FeComposite in="SourceGraphic" in2="comp1" result="comp2" />
            </Filter>
        </Defs>
        <G transform="translate(1.8972 .56127)">
            <G filter="url(#filterSettingsMulDivGear)">
                <Path
                    d="m29.018 21.182a5.8616 5.8616 0 0 1-7.6584 3.1723 5.8616 5.8616 0 0 1-3.1723-7.6584 5.8616 5.8616 0 0 1 7.6584-3.1723 5.8616 5.8616 0 0 1 3.1723 7.6584zm1.4635-18.85-1.1679-0.48045c-1.9831-0.8152-2.1457-0.49194-3.3525 1.5974l-1.089 1.8845a13.677 13.677 0 0 0-2.5268 0.020031l-1.1006-1.9047c-1.2069-2.0894-1.3697-2.4122-3.3527-1.597l-1.1681 0.47992-1.1653 0.48657c-1.9787 0.82579-1.8656 1.1692-1.2416 3.5l0.5687 2.1251a13.677 13.677 0 0 0-1.801 1.7725l-2.1026-0.56254c-2.3308-0.624-2.6743-0.73765-3.5 1.2411l-0.48608 1.1656-0.48045 1.1679c-0.81513 1.9831-0.49194 2.1456 1.5974 3.3525l1.8846 1.089a13.677 13.677 0 0 0 0.02003 2.5268l-1.9048 1.1006c-2.0894 1.2069-2.4122 1.3697-1.597 3.3527l0.47992 1.1681 0.48657 1.1653c0.82578 1.9787 1.1692 1.8656 3.5 1.2416l2.1251-0.5687a13.677 13.677 0 0 0 1.7725 1.801l-0.5625 2.1027c-0.624 2.3308-0.73765 2.6743 1.2411 3.5l1.1656 0.48608 1.1679 0.48045c1.9831 0.81513 2.1457 0.49194 3.3525-1.5974l1.089-1.8845a13.677 13.677 0 0 0 2.5268-0.02011l1.1006 1.9048c1.2069 2.0894 1.3697 2.4122 3.3527 1.597l1.1681-0.47992 1.1653-0.48657c1.9787-0.82579 1.8656-1.1692 1.2416-3.5l-0.5687-2.1251a13.677 13.677 0 0 0 1.801-1.7725l2.1026 0.56254c2.3308 0.624 2.6743 0.73761 3.5-1.2411l0.48608-1.1656 0.48045-1.1679c0.81513-1.9831 0.49194-2.1457-1.5974-3.3525l-1.8739-1.0829a13.677 13.677 0 0 0-5.97e-4 -2.5501l1.8746-1.0834c2.0894-1.2069 2.4122-1.3697 1.597-3.3527l-0.47984-1.1681-0.48657-1.1653c-0.82579-1.9787-1.1692-1.8656-3.5-1.2416l-2.0916 0.55948a13.677 13.677 0 0 0-1.8028-1.8036l0.55929-2.0907c0.624-2.3308 0.73761-2.6743-1.2411-3.5z"
                    fill="#49683b"
                    strokeLinejoin="round"
                    strokeMiterlimit="0"
                    strokeWidth=".24428"
                />
            </G>
            <G transform="matrix(2.7174 0 0 2.7174 .0010582 14.499)" filter="url(#filterSettingsMulDivCircles)">
                <Circle cx="13.838" cy="4.3937" r="3.68" fill="#cdddc6" />
                <Circle cx="3.5336" cy="4.3938" r="3.68" fill="#91ae85" />
            </G>
        </G>
        <Path
            d="m16.936 22.064a1.4811 1.4811 0 0 0-2.0945 0l-3.3413 3.3413-3.3413-3.3413a1.4811 1.4811 0 0 0-2.0945 0 1.4811 1.4811 0 0 0 0 2.0945l3.3413 3.3413-3.3413 3.3413a1.4811 1.4811 0 0 0 0 2.0945 1.4811 1.4811 0 0 0 2.0945 0l3.3413-3.3413 3.3413 3.3413a1.4811 1.4811 0 0 0 2.0945 0 1.4811 1.4811 0 0 0 0-2.0945l-3.3413-3.3413 3.3413-3.3413a1.4811 1.4811 0 0 0 0-2.0945z"
            fill="#cdddc6"
            strokeLinejoin="round"
            strokeMiterlimit="0"
            strokeWidth=".049883"
        />
        <Path
            d="m33.345 25.884a1.6155 1.6155 0 0 0-1.6155 1.6155 1.6155 1.6155 0 0 0 1.6155 1.6155h12.308a1.6155 1.6155 0 0 0 1.6155-1.6155 1.6155 1.6155 0 0 0-1.6155-1.6155zm7.7016 6.3639a1.6539 1.6539 0 0 1-1.6539 1.6539 1.6539 1.6539 0 0 1-1.6539-1.6539 1.6539 1.6539 0 0 1 1.6539-1.6539 1.6539 1.6539 0 0 1 1.6539 1.6539zm0.21277-9.4967a1.6539 1.6539 0 0 1-1.6539 1.6539 1.6539 1.6539 0 0 1-1.6539-1.6539 1.6539 1.6539 0 0 1 1.6539-1.6539 1.6539 1.6539 0 0 1 1.6539 1.6539z"
            fill="#79966c"
            strokeWidth="2.7174"
        />
    </Svg>
);
