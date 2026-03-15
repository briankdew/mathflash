import { useCallback, useState } from 'react';

export function useSessionInput(isInputEnabled: boolean) {
    const [inputValue, setInputValueState] = useState('');

    const appendInputDigit = useCallback((digit: string) => {
        if (!isInputEnabled) return;
        setInputValueState(prev => prev + digit);
    }, [isInputEnabled]);

    const setInputValue = useCallback((value: string) => {
        if (!isInputEnabled && value !== '') return;
        setInputValueState(value);
    }, [isInputEnabled]);

    const clearInputValue = useCallback(() => {
        setInputValueState('');
    }, []);

    const resetInputValue = useCallback(() => {
        setInputValueState('');
    }, []);

    return {
        inputValue,
        appendInputDigit,
        setInputValue,
        clearInputValue,
        resetInputValue,
    };
}
