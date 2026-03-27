// src/components/ThreeCanvas.tsx
import {useRef, useEffect} from 'react';

import {Game} from "../Three/Game.ts";
import {InputInfo} from "../InputMaps.ts";
import {GameUIMain} from "./Game/UserInterface/UI-Main.tsx";


export const ThreeCanvas = () => {

    const canvasRef = useRef<HTMLDivElement>(null);

    //Refresh game on page save -- Ensure canvas gets properly reloaded after modifications to ThreeJS Code
    useEffect(() => {
        if (import.meta.env.DEV && import.meta.hot) {
            import.meta.hot.accept(() => {
                window.location.reload();
            });
        }
    }, []);


    useEffect(() => {
        const container = canvasRef.current;
        if (!container) return;

        // Pre-clean any existing canvas
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            container.removeChild(existingCanvas);
            console.log("Removed existing canvas before mount");
        }

        console.log("Creating Game")
        const game : Game = new Game();
        //game.Start();

        //TODO Clean this up a bit!
        container.appendChild(game.renderer.renderer.domElement);

        container.addEventListener('click', () => {
            container.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === container) {
                InputInfo.gameHasFocus = true;
            } else {
                InputInfo.gameHasFocus = false;
            }
        });


        //TODO Reimplement this!
    //    return () => {
    //        console.log("ThreeCanvas cleanup");
    //        renderer.dispose();
    //        if (container.contains(renderer.domElement)) {
    //            container.removeChild(renderer.domElement);
    //            console.log("Canvas removed on unmount");
    //        }
    //    };
    }, []);

    return <div className={"relative"}>
        <GameUIMain />
            <div className="" ref={canvasRef}/>
        </div>
        ;
        };