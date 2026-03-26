
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {ThreeCanvas} from "./Components/Canvas.tsx";

import {ReactInputHandler} from "./Components/ReactInputHandler.tsx";
import {Game} from "./Three/Game.ts";

function App() {




    return (
        <>
          <p id="fps-counter">FPS: 0</p>
          <ReactInputHandler/>
          <ThreeCanvas/>

          <div>
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo"/>
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo"/>
            </a>

          </div>
          <h1>Vite + React</h1>
          <div className="card">

            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="read-the-docs">
            Click on the Vite and React logos to learn more
          </p>
        </>
    )
}

export default App


// src/components/SomeComponent.tsx
//import { useState, useEffect } from 'react';
//import { SomeHookOrUtil } from '../hooks/useSomething';
//import './SomeComponent.css'; // optional if using Tailwind/DaisyUI
//
//type Props = {
//    title: string;
//    onClick?: () => void;
//    isActive?: boolean;
//};
//
//export const SomeComponent = ({ title, onClick, isActive = false }: Props) => {
//    const [internalState, setInternalState] = useState(false);
//
//    useEffect(() => {
//        if (isActive) {
//            // Handle something when active
//        }
//    }, [isActive]);
//
//    return (
//        <div className={`component-wrapper ${isActive ? 'active' : ''}`}>
//            <h2>{title}</h2>
//            <button onClick={onClick}>Click Me</button>
//        </div>
//    );
//};
//