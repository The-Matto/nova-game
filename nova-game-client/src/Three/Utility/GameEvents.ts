//Minimal typed pub-sub for gameplay code (Three-side, not React) to notify the UI layer about
//things without either side needing a direct reference to the other - e.g. the goal volume
//telling LevelCompleteOverlay the level finished.

export type GameEventMap = {
    levelComplete : undefined;
    //Player reached the goal but objectives are still outstanding.
    goalBlocked : { remaining : string[] };
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
