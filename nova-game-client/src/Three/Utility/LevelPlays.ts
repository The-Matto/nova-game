import type {RecordLevelPlayRequest} from "nova-shared/level-listing";

//Fire-and-forget - call once whenever a level is picked to play (see MainMenu.tsx/App.tsx), not
//on every retry. A dropped play count isn't worth blocking navigation over.
export function RecordLevelPlay(levelId : string) : void {
    const body : RecordLevelPlayRequest = {levelId};
    fetch('/api/levels/play', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
    }).catch(() => {/* Best-effort - see server-side RecordLevelPlay. */});
}
