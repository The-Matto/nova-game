import type {NVActor} from "../Actor.ts";

//Minimal typed pub-sub so Three-side gameplay code can notify the React UI layer without either
//side holding a direct reference to the other.

export type GameEventMap = {
    levelComplete : undefined;
    //Fired when ToggleEditorMode runs, so UI can react without polling EditorState.
    editorModeChanged : { isInEditor : boolean };
    //Fired whenever EditorSelection.SelectActor runs.
    actorSelectionChanged : { actor : NVActor | null };
    //Fired continuously while the gizmo is dragging the selected actor - see
    //EditorSelection.GetControls's 'objectChange' listener.
    actorTransformChanged : undefined;
    //Opens the game menu (see GameMenuOverlay) - death (NVPlayerCharacter.PlayerDeath) or a
    //voluntary pause (NVPlayerCharacter.Pause, 'P' during gameplay) share the same menu.
    gameMenuOpened : { reason : 'died' | 'paused' };
    //Closes the menu without resetting anything - only reachable from a voluntary pause, via
    //NVPlayerCharacter.Resume ('P' again).
    gameResumed : undefined;
    //Fired whenever the level's actor count changes (spawn, destroy, reload) - see
    //NVScene.MAX_LEVEL_ACTORS / GetLevelActorCount.
    levelActorCountChanged : { count : number, max : number };
};

type Listener<T> = (payload : T) => void;

class GameEventBus {

    private listeners = new Map<keyof GameEventMap, Set<Listener<unknown>>>();

    //Returns an unsubscribe function - handy directly as a useEffect cleanup.
    public On<K extends keyof GameEventMap>(event : K, listener : Listener<GameEventMap[K]>) : () => void {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(listener as Listener<unknown>);
        return () => this.Off(event, listener);
    }

    public Off<K extends keyof GameEventMap>(event : K, listener : Listener<GameEventMap[K]>) : void {
        this.listeners.get(event)?.delete(listener as Listener<unknown>);
    }

    public Emit<K extends keyof GameEventMap>(event : K, payload : GameEventMap[K]) : void {
        this.listeners.get(event)?.forEach(listener => listener(payload));
    }
}

export const GameEvents = new GameEventBus();
