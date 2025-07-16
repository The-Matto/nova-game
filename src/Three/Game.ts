
import * as THREE from 'three';
import {NVRenderer} from "./Renderer.ts";
import {Scene} from "./Scene.ts";
import {NVPlayerCharacter} from "./Actors/PlayerCharacter.ts";

import "./Includes.ts"

export class Game {


    clock: THREE.Clock;
    renderer: NVRenderer;
    static scene = new Scene();

    constructor() {
        this.renderer = new NVRenderer(this.Tick.bind(this));
        Game.scene = new Scene();
        this.clock = new THREE.Clock();
        console.log("Construct Game")

    }


    //Called every game frame
    Tick(){
        const deltaTime : number = Math.min( 0.05, this.clock.getDelta() );
       // console.log(Game.scene.GetSceneActors());
        //Call tick on every registered actor
        for(const actor of Game.scene.GetSceneActors()) {

            if (actor.CanCallTick()) {
                actor.Tick(deltaTime);
            }
        }



        //Render the frame
        this.renderer.RenderFrame(Game.scene, NVPlayerCharacter.GetCamera());
    }
}