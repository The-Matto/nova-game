
import {useState} from 'react';
import './App.css'
import {ThreeCanvas} from "./Components/Canvas.tsx";
import {ReactInputHandler} from "./Components/ReactInputHandler.tsx";
import {MainMenu} from "./Components/Game/UserInterface/MainMenu.tsx";
import {HomeLink} from "./Components/HomeLink.tsx";

function App() {

    //The game (Canvas -> Game) only mounts once a choice is made on the main menu - see
    //MainMenu, which also sets GameMode.appMode beforehand.
    const [gameStarted, setGameStarted] = useState(false);

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
