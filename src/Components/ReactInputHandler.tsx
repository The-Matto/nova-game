import { useEffect } from 'react';
import {InputInfo, keyActions, keyStates, mousePosition} from "../InputMaps.ts";

export function ReactInputHandler() {

    //TODO I need to ensure that canvas has focus before I capture the input. I should unbind these functions on lose focus
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            console.log(event.code, keyStates)
            if (event.code in keyActions) {
                keyStates[event.code] = false;
                keyActions[event.code].isActive = true;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code in keyActions) {
                keyStates[event.code] = false;
                keyActions[event.code].isActive = false;
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            mousePosition.x = (event.movementX / 500) * InputInfo.mouseSensitivity;
            mousePosition.y = (event.movementY / 500) * InputInfo.mouseSensitivity;
        };


        document.addEventListener( 'mousemove', handleMouseMove);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('keydown', handleKeyDown);

        };
    }, []);

    return null;
}
