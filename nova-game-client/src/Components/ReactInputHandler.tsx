import { useEffect } from 'react';
import { keyActions, keyStates, ModifierKeys, mousePosition} from "../InputMaps.ts";
import {EditorState, PlayerSettings, PlayerStatics} from "../Three/Utility/PlayerGlobals.ts";

export function ReactInputHandler() {

    //TODO I need to ensure that canvas has focus before I capture the input. I should unbind these functions on lose focus
    useEffect(() => {
        //True while a text input has focus - typing there shouldn't also move the player.
        const isTypingIntoInput = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            return !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code === 'AltLeft' || event.code === 'AltRight') ModifierKeys.isAltDown = true;

            if (isTypingIntoInput(event)) return;

            if (event.code in keyActions) {
                event.preventDefault();

                keyStates[event.code] = false;
                keyActions[event.code].isActive = true;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === 'AltLeft' || event.code === 'AltRight') ModifierKeys.isAltDown = false;

            if (isTypingIntoInput(event)) return;

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
        const handleMouseDown = (event: MouseEvent) => {
            // 0 = Left click, 1 = Middle, 2 = Right
            if (!PlayerStatics.PlayerController) return;

            //Ignore clicks on UI overlaying the canvas (it's a DOM sibling, not a descendant).
            const canvasEl = document.getElementById('canvas');
            if (!canvasEl?.contains(event.target as Node)) return;

            if (event.button === 0) {
                PlayerStatics.PlayerController.SetLeftMouseDown(true);
                PlayerStatics.PlayerController.HandleMouseClick(event.button, event.clientX, event.clientY, event.ctrlKey)
            } else if (event.button === 2) {
                PlayerStatics.PlayerController.SetRightMouseDown(true);
            }
        }
        const handleMouseUp = (event: MouseEvent) => {
            if (event.button === 0) {
                PlayerStatics.PlayerController?.SetLeftMouseDown(false);
            } else if (event.button === 2) {
                PlayerStatics.PlayerController?.SetRightMouseDown(false);
            }
        }
        //Editor mode uses the right mouse button to look around, so stop it opening the
        //browser's native context menu.
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        }

        //Alt-Tabbing away is a common way to lose Alt's keyup - without this it'd stay stuck
        //"down", silently duplicating actors on every gizmo drag until pressed again.
        const handleBlur = () => {
            ModifierKeys.isAltDown = false;

            //Losing window focus mid-run shouldn't let the game keep ticking unseen.
            if (EditorState.isInEditor) return;
            const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
            if (physics && !physics.isDead && !physics.isPaused && !physics.isLevelComplete) PlayerStatics.PlayerCharacter?.Pause();
        };

        document.addEventListener( 'mousemove', handleMouseMove);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('blur', handleBlur);

        };
    }, []);

    return null;
}
