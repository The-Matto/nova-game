import { useEffect } from 'react';
import { keyActions, keyStates, mousePosition} from "../InputMaps.ts";
import {PlayerSettings} from "../Three/Utility/PlayerGlobals.ts";

export function ReactInputHandler() {

    //TODO I need to ensure that canvas has focus before I capture the input. I should unbind these functions on lose focus
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code in keyActions) {
                event.preventDefault();

                keyStates[event.code] = false;
                keyActions[event.code].isActive = true;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code in keyActions) {
                event.preventDefault();

                keyStates[event.code] = false;
                keyActions[event.code].isActive = false;

                keyActions[event.code].endFunc();
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            //TODO Move the usable conversion to NVCamera AddLookInput()
            mousePosition.x = (event.movementX / 500) * PlayerSettings.mouseSensitivityX;
            mousePosition.y = (event.movementY / 500) * PlayerSettings.mouseSensitivityY;

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
