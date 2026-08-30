const STORAGE_KEY = 'nova-game:player-name';

//A stable per-browser display name for leaderboard submissions - there's no real account system
//yet, so this is generated once and remembered, same idea as PlayerSettings' persistence.
function LoadOrCreateName() : string {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return saved;
    } catch {
        //Ignore - fall through to a fresh name.
    }

    const name = `Player${Math.floor(1000 + Math.random() * 9000)}`;
    try {
        localStorage.setItem(STORAGE_KEY, name);
    } catch {
        //Ignore - not critical if this fails.
    }
    return name;
}

export const PlayerIdentity = {
    name: LoadOrCreateName(),
};
