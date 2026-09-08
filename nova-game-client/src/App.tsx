
import {useEffect, useState} from 'react';
import './App.css'
import {ThreeCanvas} from "./Components/Canvas.tsx";
import {ReactInputHandler} from "./Components/ReactInputHandler.tsx";
import {MainMenu} from "./Components/Game/UserInterface/MainMenu.tsx";
import {HomeLink} from "./Components/HomeLink.tsx";
import {ConsumePendingLevelSelection, CursorState, EditorState, GameMode, LevelSelection} from "./Three/Utility/PlayerGlobals.ts";
import {RecordLevelPlay} from "./Three/Utility/LevelPlays.ts";
import {PlaySound} from "./Three/Utility/Sound.ts";

function App() {

    //Delegated rather than wiring every individual button's onClick - there are dozens of them
    //across the menus/editor/HUD, and any button anywhere should make this sound.
    useEffect(() => {
        const onClick = (e : MouseEvent) => {
            if ((e.target as HTMLElement | null)?.closest('button')) PlaySound('uiClick');
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);

    //Same delegation as the click sound above. 'mouseover' bubbles (unlike 'mouseenter'), so the
    //relatedTarget check re-derives enter-once behavior: skip it when the pointer came from
    //somewhere already inside the same button (e.g. moving between its icon and label).
    useEffect(() => {
        const onHover = (e : MouseEvent) => {
            const button = (e.target as HTMLElement | null)?.closest('button');
            if (!button || button.disabled) return;
            if (button.contains(e.relatedTarget as Node | null)) return;
            PlaySound('uiHover', 0.4);
        };
        document.addEventListener('mouseover', onHover);
        return () => document.removeEventListener('mouseover', onHover);
    }, []);

    //The game (Canvas -> Game) only mounts once a choice is made on the main menu - see
    //MainMenu, which also sets GameMode.appMode beforehand. A queued level (see
    //QueuePlayLevelAndReload) skips the menu and starts straight into play instead.
    const [gameStarted, setGameStarted] = useState(() => {
        const pending = ConsumePendingLevelSelection();
        if (!pending) return false;
        LevelSelection.selectedLevelPath = pending.path;
        LevelSelection.selectedLevelId = pending.id;
        GameMode.appMode = "play";
        EditorState.isInEditor = false;
        CursorState.isCursorNeeded = false;
        RecordLevelPlay(pending.id);
        return true;
    });

    if (!gameStarted) {
        return <>
            <HomeLink/>
            <MainMenu onStart={() => setGameStarted(true)} />
        </>;
    }

    return (
        <>
          <HomeLink/>
          <p id="fps-counter" className="fixed top-9 left-2 z-20 text-white text-xs">FPS: 0</p>
          <ReactInputHandler/>
          <ThreeCanvas/>
        </>
    )
}

export default App
