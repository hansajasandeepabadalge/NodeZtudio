import { useEffect } from 'react';

type KeyMap = Record<string, () => void>;

/** Registers global keyboard shortcuts; cleans up on unmount. */
export function useKeyboard(keyMap: KeyMap) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const handler = keyMap[e.key.toUpperCase()];
            handler?.();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyMap]);
}
