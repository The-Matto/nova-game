
import * as THREE from 'three';
import {NVRenderer} from "./Renderer.ts";
import {NVScene} from "./NVScene.ts";
import {NVPlayerCharacter} from "./Actors/PlayerCharacter.ts";

import "./Includes.ts"
import {InputInfo} from "../InputMaps.ts";
import {ClientNetDriver} from "../NetDriver/client-net-driver.ts";
import {GameStats} from "./Utility/PlayerGlobals";
import {UiDOMInterop} from "./UI/ui-DOM-interop";

export class Game {


    clock: THREE.Clock;
    renderer: NVRenderer;

    //Singleton
    private static instance : Game;

    static scene : NVScene;

    uiDOMInterop : UiDOMInterop;

    constructor() {
        Game.instance = this;

        this.renderer = new NVRenderer(this.Tick.bind(this));
        Game.scene = new NVScene();
        this.clock = new THREE.Clock();
        this.uiDOMInterop = new UiDOMInterop();

        console.log("Construct Game")

        const netDriver = new ClientNetDriver();
        netDriver.CreateSocket();

    }

    static GetInstance() : Game {
        return Game.instance;
    }


    //Called every game frame
    Tick(){

        //Mostly disable tick when game has no focus - TODO Maybe just reduce FPS to like 3FPS
        if (InputInfo.gameHasFocus){
           // console.log(document.elementFromPoint(800, 900));

            //TODO Maybe we should have fixed physics step, this Tick() is based on render time
            //
             GameStats.deltaTime = Math.min( 0.05, this.clock.getDelta() );
            GameStats.fps = 1 / GameStats.deltaTime;

       // console.log(Game.scene.GetSceneActors());
        //Call tick on every registered actor
        for(const actor of NVScene.GetSceneActors()) {

            if (actor.CanCallTick()) {
                actor.Tick(GameStats.deltaTime);
            }
        }

        //Render the frame
        this.renderer.RenderFrame(Game.scene, NVPlayerCharacter.GetCamera());

        //Update game UI render
        this.uiDOMInterop.tick()
        }
    }
}