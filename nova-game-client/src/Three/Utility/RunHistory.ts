const RUN_HISTORY_STORAGE_KEY = 'nova-game:run-history';
const MAX_HISTORY_ENTRIES = 5;

interface LevelHistory {
    bestTime : number;
    //Most recent first. Only runs that *didn't* beat bestTime land here - a run that does becomes
    //the new bestTime instead, since the record itself is already visible via the leaderboard;
    //this list is specifically the attempts that aren't.
    attempts : number[];
}

function LoadStore() : Record<string, LevelHistory> {
    try {
        return JSON.parse(localStorage.getItem(RUN_HISTORY_STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
}

function SaveStore(store : Record<string, LevelHistory>) {
    try {
        localStorage.setItem(RUN_HISTORY_STORAGE_KEY, JSON.stringify(store));
    } catch {
        //Ignore - not critical if this fails.
    }
}

//Call once per completed run (see LevelCompleteOverlay) - updates this browser's local record
//for the level, either raising bestTime or appending to the attempts list, never both. Returns
//whether this run became the new bestTime (including a level's first-ever completion), so the
//caller can trigger a PB celebration.
export function RecordRun(levelId : string, timeSeconds : number) : boolean {
    const store = LoadStore();
    const existing = store[levelId];
    const isNewBest = !existing || timeSeconds < existing.bestTime;

    store[levelId] = isNewBest
        ? {bestTime: timeSeconds, attempts: existing?.attempts ?? []}
        : {bestTime: existing.bestTime, attempts: [timeSeconds, ...existing.attempts].slice(0, MAX_HISTORY_ENTRIES)};

    SaveStore(store);
    return isNewBest;
}

//Most recent non-PB attempts first - empty if this level's never been played on this browser, or
//every run so far has been a new best.
export function GetRunHistory(levelId : string) : number[] {
    return LoadStore()[levelId]?.attempts ?? [];
}
