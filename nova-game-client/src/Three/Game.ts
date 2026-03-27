
import * as THREE from 'three';
import {NVRenderer} from "./Renderer.ts";
import {Scene} from "./Scene.ts";
import {NVPlayerCharacter} from "./Actors/PlayerCharacter.ts";

import "./Includes.ts"
import {InputInfo} from "../InputMaps.ts";

export class Game {


    clock: THREE.Clock;
    renderer: NVRenderer;

    static deltaTime : number;
    static FPS : number;

    static scene : Scene;

    fpsDisplay : HTMLElement | null;

    constructor() {
        this.renderer = new NVRenderer(this.Tick.bind(this));
        Game.scene = new Scene();
        this.clock = new THREE.Clock();

        this.fpsDisplay = document.getElementById('fps-counter');

        console.log("Construct Game")

        //TODO Create and load JWT to passthrough here, so that server can auth player
        const socket = new WebSocket('ws://localhost:8080/game?UID=41');
        socket.binaryType = 'arraybuffer';
        socket.onopen = () => {
            console.log('Connected to server');
            socket.send('Hello from client!');
        };

        socket.onmessage = event => {
            console.log(event.data);
        };

        socket.onclose = () => {
            console.log('Disconnected');
        };

        socket.onerror = error => {
            console.error('WebSocket error:', error);
        };

    }


    //Called every game frame
    Tick(){

        //Mostly disable tick when game has no focus - TODO Maybe just reduce FPS to like 3FPS
        if (InputInfo.gameHasFocus){


            //TODO Maybe we should have fixed physics step, this Tick() is based on render time
        Game.deltaTime = Math.min( 0.05, this.clock.getDelta() );
        Game.FPS = 1 / Game.deltaTime;

            if (this.fpsDisplay) {
                this.fpsDisplay.innerText = `FPS: ${Math.round(Game.FPS)}`;
            }

       // console.log(Game.scene.GetSceneActors());
        //Call tick on every registered actor
        for(const actor of Game.scene.GetSceneActors()) {

            if (actor.CanCallTick()) {
                actor.Tick(Game.deltaTime);
            }
        }



        //Render the frame
        this.renderer.RenderFrame(Game.scene, NVPlayerCharacter.GetCamera());
        }
    }
}