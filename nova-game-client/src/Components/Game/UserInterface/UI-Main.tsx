
import {NVPlayerCharacter} from "../../../Three/Actors/PlayerCharacter";

//TEMP
import * as THREE from "three"
//
import {VirtualCursor} from "./virtual-cursor";
import {useEffect, useRef} from "react";
import {PlayerStatics} from "../../../Three/Utility/PlayerGlobals";
import {Game} from "../../../Three/Game";
import {TransformControls} from "three/examples/jsm/controls/TransformControls";
import {NVScene} from "../../../Three/NVScene";


export interface InteractiveElement extends HTMLElement {
    remoteTrigger?: () => void;
}

export const GameUIMain = () => {

    const domRef = useRef<HTMLDivElement>(null);

    const internalAction = () => {

        const playerChar : NVPlayerCharacter | undefined = PlayerStatics.PlayerCharacter;

        if (playerChar)
            playerChar.GetPhysicsComp().isFreeFlying = !playerChar.GetPhysicsComp().isFreeFlying;

        // 1. Get the raw dependencies
        const scene = NVScene;
        const camera = NVPlayerCharacter.GetCamera();
        const canvas = Game.GetInstance().renderer.canvas;

// 2. Validate they exist before proceeding
        if (scene && camera && canvas) {
            const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
            scene.scene.add(cube);

            const controls = new TransformControls(camera.GetCamera(), canvas);
            controls.attach(cube);

            // Only add the helper
            const helper = controls.getHelper();
            scene.scene.add(helper);
           // controls.getRaycaster().setFromCamera(pointer, camera);


// If you are using custom logic, you might need to trigger the update manually
            controls.update();
            // Debug: Check if the helper is actually a THREE.Group/Object3D
            console.log("Helper added to scene:", helper);
        } else {
            console.error("TransformControls missing dependencies:", { scene, camera, canvas });
        }
    };

    useEffect(() => {
        if (domRef.current) {
            // Attach the function directly to the DOM element object
            (domRef.current as InteractiveElement).remoteTrigger = internalAction;
        }
    }, []);


    return <>
        <VirtualCursor />
        <div ref={domRef} className="absolute bg-slate-900 p-4 rounded-xl text-3xl text-orange-500 bottom-1 right-1">Editor
        </div>
    </>
}