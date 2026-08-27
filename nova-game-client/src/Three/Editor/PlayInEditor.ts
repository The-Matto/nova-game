import * as THREE from "three";
import {NVScene} from "../NVScene.ts";
import {NVEditorPawn} from "../Actors/EditorPawn.ts";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter.ts";
import {NVPlayerSpawn} from "../Actors/PlayerSpawn.ts";
import {PlayerController} from "../Actors/PlayerController.ts";
import {GameMode, PlayerStatics} from "../Utility/PlayerGlobals.ts";
import type {LevelData} from "../ClassDescripter.ts";
import {EditorSelection} from "./EditorSelection.ts";

//Orchestrates "Play In Editor" (PIE): switching between the always-present editor pawn and a
//real player character spawned fresh each time you test-play the level. See
//PlayerController.ToggleEditorMode, which calls into this. Also owns startup, via GameMode.
export class PlayInEditor {

    private static controller : PlayerController;
    private static editorPawn : NVEditorPawn | null = null;
    private static playerPawn : NVPlayerCharacter | null = null;

    //Snapshot of the level taken right before the player is spawned (see StartPlaying) - what
    //StopPlaying/RestartPlaying respawn from, so PIE never touches the original level file and
    //editor edits made before pressing 'P' survive the play session.
    private static levelSnapshot : LevelData | null = null;

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
        PlayInEditor.levelSnapshot = NVScene.SerializeLevel();
        //The gizmo is an editor tool - don't leave it attached/visible during actual play.
        EditorSelection.ClearSelection();
        //Actors already placed had BeginPlay() skipped at spawn time since we were still in
        //editor mode - see NVScene.SpawnActor. Real play is starting now.
        NVScene.BeginPlayForLevelActors();

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

    //Destroys the player, repossesses the editor pawn, and respawns from the pre-play snapshot
    //so anything placed or triggered during play is discarded - without touching the original
    //level file, so edits made before pressing 'P' are kept.
    public static StopPlaying(){
        if (PlayInEditor.playerPawn){
            NVScene.DestroyActor(PlayInEditor.playerPawn);
            PlayInEditor.playerPawn = null;
            PlayerStatics.PlayerCharacter = undefined;
        }

        if (PlayInEditor.editorPawn) PlayInEditor.controller.Possess(PlayInEditor.editorPawn);
        NVScene.LoadFromSnapshot(PlayInEditor.levelSnapshot ?? NVScene.SerializeLevel());
    }

    //Used by "Play Again": destroys the current player, respawns from the snapshot, and spawns
    //a fresh one at the spawn marker.
    public static RestartPlaying(){
        if (PlayInEditor.playerPawn){
            NVScene.DestroyActor(PlayInEditor.playerPawn);
            PlayInEditor.playerPawn = null;
            PlayerStatics.PlayerCharacter = undefined;
        }

        NVScene.LoadFromSnapshot(PlayInEditor.levelSnapshot ?? NVScene.SerializeLevel());
        PlayInEditor.StartPlaying();
    }
}
