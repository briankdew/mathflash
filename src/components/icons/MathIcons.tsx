import React from 'react';
import Svg, { Path, Defs, Filter, FeDropShadow, G, FeFlood, FeGaussianBlur, FeOffset, FeComposite } from 'react-native-svg';

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
