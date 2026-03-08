import React from 'react';
import Svg, { Path, Defs, Filter, FeDropShadow } from 'react-native-svg';

export const IconPlus = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filter40" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path
            d="m 7.1999999,2.0799999 c -0.57933,0 -1.049,0.46964 -1.049,1.049 v 3.022 h -3.022 c -0.57933,0 -1.049,0.46964 -1.049,1.049 0,0.57936 0.46964,1.049 1.049,1.049 h 3.022 V 11.271 c 0,0.57933 0.46964,1.049 1.049,1.049 0.57933,0 1.049,-0.46964 1.049,-1.049 V 8.2489999 H 11.271 c 0.57933,0 1.049,-0.46964 1.049,-1.049 0,-0.57936 -0.46964,-1.049 -1.049,-1.049 H 8.2489999 v -3.022 c 0,-0.57933 -0.46964,-1.049 -1.049,-1.049 z"
            fill="currentColor"
            strokeLinejoin="round"
            strokeMiterlimit="0"
            strokeWidth="0.035331"
            filter="url(#filter40)"
        />
    </Svg>
);

export const IconTimes = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filterTimes" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path d="m11.052 3.3477a1.0496 1.0496 0 0 0-1.4844 5e-7l-2.3679 2.3679-2.3679-2.3679a1.0496 1.0496 0 0 0-1.4844 6e-7 1.0496 1.0496 0 0 0 3e-7 1.4844l2.3679 2.3679-2.3679 2.3679a1.0496 1.0496 0 0 0 0 1.4844 1.0496 1.0496 0 0 0 1.4844 0l2.3679-2.3679 2.3679 2.3679a1.0496 1.0496 0 0 0 1.4844 0 1.0496 1.0496 0 0 0 0-1.4844l-2.3679-2.3679 2.3679-2.3679a1.0496 1.0496 0 0 0 0-1.4844z" strokeLinejoin="round" strokeMiterlimit="0" strokeWidth="0.035352" fill="currentColor" filter="url(#filterTimes)" />
    </Svg>
);

export const IconMinus = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filterMinus" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path d="m3.8763 6.1504a1.0496 1.0496 0 0 0-1.0496 1.0496 1.0496 1.0496 0 0 0 1.0496 1.0496h6.6475a1.0496 1.0496 0 0 0 1.0496-1.0496 1.0496 1.0496 0 0 0-1.0496-1.0496z" fill="currentColor" filter="url(#filterMinus)" />
    </Svg>
);

export const IconDivide = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filterDivide" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path d="m3.2015 6.1504a1.0496 1.0496 0 0 0-1.0496 1.0496 1.0496 1.0496 0 0 0 1.0496 1.0496h7.9969a1.0496 1.0496 0 0 0 1.0496-1.0496 1.0496 1.0496 0 0 0-1.0496-1.0496zm5.0039 4.1347a1.0746 1.0746 0 0 1-1.0746 1.0746 1.0746 1.0746 0 0 1-1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746 1.0746zm0.13824-6.1702a1.0746 1.0746 0 0 1-1.0746 1.0746 1.0746 1.0746 0 0 1-1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746 1.0746z" fill="currentColor" filter="url(#filterDivide)" />
    </Svg>
);
