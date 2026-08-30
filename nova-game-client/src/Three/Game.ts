
import * as THREE from 'three';
import {NVRenderer} from "./Renderer.ts";
import {NVScene} from "./NVScene.ts";
import {MainCamera} from "./Camera.ts";
import {PlayInEditor} from "./Editor/PlayInEditor.ts";
import {EditorSelection} from "./Editor/EditorSelection.ts";

import "./Includes.ts"
import {InputInfo} from "../InputMaps.ts";
import {ClientNetDriver} from "../NetDriver/client-net-driver.ts";
import {GameStats} from "./Utility/PlayerGlobals";
import {TickLevelTimer} from "./Utility/LevelTimer";
import {TickCountdown} from "./Utility/Countdown";
import {UiDOMInterop} from "./UI/ui-DOM-interop";
import {acceleratedRaycast, computeBoundsTree, disposeBoundsTree} from "three-mesh-bvh";

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

        //Spawns and possesses the editor pawn - the game launches straight into editor mode.
        PlayInEditor.Initialize();

        console.log("Construct Game");

        //TODO When implementing Multiplayer lobbies
        //const netDriver = new ClientNetDriver();
        //netDriver.CreateSocket();

        //Use BVH for collision
        THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        THREE.Mesh.prototype.raycast = acceleratedRaycast;

    }

    //Singleton
    static GetInstance() : Game {
        return Game.instance;
    }


    //Called every game frame
    Tick(){

        //Mostly disable tick when game has no focus - TODO Maybe just reduce FPS to like 3FPS
        if (!InputInfo.gameHasFocus)
            return;
           // console.log(document.elementFromPoint(800, 900));

            //TODO Maybe we should have fixed physics step, this Tick() is based on render time
            //
             GameStats.deltaTime = Math.min( 0.05, this.clock.getDelta() );
            GameStats.fps = 1 / GameStats.deltaTime;
            TickLevelTimer(GameStats.deltaTime);
            TickCountdown(GameStats.deltaTime);

       // console.log(Game.scene.GetSceneActors());
        //Call tick on every registered actor
        for(const actor of NVScene.GetSceneActors()) {

            if (actor.CanCallTick()) {
                actor.Tick(GameStats.deltaTime);
            }
        }

        //Keeps selection outlines tracking their actors regardless of how they moved.
        EditorSelection.UpdateSelectionOutlines();

        //Render the frame
        this.renderer.RenderFrame(Game.scene, MainCamera);

        //Update game UI render
        this.uiDOMInterop.tick()

    }
}