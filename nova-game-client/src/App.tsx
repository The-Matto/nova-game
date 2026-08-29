
import {useState} from 'react';
import './App.css'
import {ThreeCanvas} from "./Components/Canvas.tsx";
import {ReactInputHandler} from "./Components/ReactInputHandler.tsx";
import {MainMenu} from "./Components/Game/UserInterface/MainMenu.tsx";

function App() {

    //The game (Canvas -> Game) only mounts once a choice is made on the main menu - see
    //MainMenu, which also sets GameMode.appMode beforehand.
    const [gameStarted, setGameStarted] = useState(false);

    if (!gameStarted) {
        return <MainMenu onStart={() => setGameStarted(true)} />;
    }

    return (
        <>
          <p id="fps-counter">FPS: 0</p>
          <ReactInputHandler/>
          <ThreeCanvas/>
        </>
    )
}

export default App
