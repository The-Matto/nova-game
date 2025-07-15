import { useEffect } from 'react';
import {keyActions, keyStates} from "../InputMaps.ts";


export function ReactInputHandler() {

    useEffect(() => {

        console.log('keyDowndasdas');
        const handleKeyDown = (event: KeyboardEvent) => {
            keyStates[ event.code ] = false;
            console.log('keyDown', event.code);
            const action = keyActions[event.code];
            if (action) action();
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            keyStates[ event.code ] = false;
        };

        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('keydown', handleKeyDown);

        };
    }, []);

    return null;
}
