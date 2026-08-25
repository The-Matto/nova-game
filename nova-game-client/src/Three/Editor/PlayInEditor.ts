import * as THREE from "three";
import {NVScene} from "../NVScene.ts";
import {NVEditorPawn} from "../Actors/EditorPawn.ts";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter.ts";
import {NVPlayerSpawn} from "../Actors/PlayerSpawn.ts";
import {PlayerController} from "../Actors/PlayerController.ts";
import {GameMode, PlayerStatics} from "../Utility/PlayerGlobals.ts";

//Orchestrates "Play In Editor" (PIE): switching between the always-present editor pawn and a
//real player character spawned fresh each time you test-play the level. See
//PlayerController.ToggleEditorMode, which calls into this. Also owns startup, via GameMode.
export class PlayInEditor {

    private static controller : PlayerController;
    private static editorPawn : NVEditorPawn | null = null;
    private static playerPawn : NVPlayerCharacter | null = null;

    public static Initialize(){
        PlayInEditor.controller = new PlayerController();

        if (GameMode.appMode === "play") {
            //No editor pawn in this mode. Await the initial load - StartPlaying needs the
            //NVPlayerSpawn marker to exist first.
            NVScene.initialLoadPromise.then(() => PlayInEditor.StartPlaying());
            return;
        }

        PlayInEditor.editorPawn = NVScene.SpawnActor({
            class: "NVEditorPawn",
            location: new THREE.Vector3(0, 2, 5),
            scale: new THREE.Vector3(1, 1, 1),
        }, true /*persistent*/) as NVEditorPawn;

        PlayInEditor.controller.Possess(PlayInEditor.editorPawn);
    }

    public static StartPlaying(){
        const spawnMarker = [...NVScene.GetSceneActors()].find(actor => actor instanceof NVPlayerSpawn);
        const location = spawnMarker ? spawnMarker.scene.position.clone() : new THREE.Vector3();

        PlayInEditor.playerPawn = NVScene.SpawnActor({
            class: "NVPlayerCharacter",
            location,
            scale: new THREE.Vector3(1, 1, 1),
        }) as NVPlayerCharacter;

        PlayerStatics.PlayerCharacter = PlayInEditor.playerPawn;
        PlayInEditor.controller.Possess(PlayInEditor.playerPawn);
    }

    //Destroys the player, repossesses the editor pawn, and reloads the level so anything placed
    //or triggered during play is discarded.
    public static StopPlaying(){
        if (PlayInEditor.playerPawn){
            NVScene.DestroyActor(PlayInEditor.playerPawn);
            PlayInEditor.playerPawn = null;
            PlayerStatics.PlayerCharacter = undefined;
        }

        if (PlayInEditor.editorPawn) PlayInEditor.controller.Possess(PlayInEditor.editorPawn);
        NVScene.ReloadLevel();
    }

    //Used by "Play Again": destroys the current player, reloads the level, and respawns a
    //fresh one at the spawn marker.
    public static async RestartPlaying(){
        if (PlayInEditor.playerPawn){
            NVScene.DestroyActor(PlayInEditor.playerPawn);
            PlayInEditor.playerPawn = null;
            PlayerStatics.PlayerCharacter = undefined;
        }

        await NVScene.ReloadLevel();
        PlayInEditor.StartPlaying();
    }
}
