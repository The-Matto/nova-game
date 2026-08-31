import type {PlayerIdentityDto} from "nova-shared/player";

const NAME_STORAGE_KEY = 'nova-game:player-name';
const ID_STORAGE_KEY = 'nova-game:player-id';

//A stable per-browser display name, generated once and remembered locally - same idea as
//PlayerSettings' persistence. Shown instantly, with no network dependency.
function LoadOrCreateName() : string {
    try {
        const saved = localStorage.getItem(NAME_STORAGE_KEY);
        if (saved) return saved;
    } catch {
        //Ignore - fall through to a fresh name.
    }

    const name = `Player${Math.floor(1000 + Math.random() * 9000)}`;
    try {
        localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
        //Ignore - not critical if this fails.
    }
    return name;
}

export const PlayerIdentity = {
    name: LoadOrCreateName(),
    //Set once EnsureRegistered() resolves - null until then. There's no account system yet (see
    //CLAUDE.md), so this is minted by POST /api/players the first time this browser is seen.
    id: null as string | null,
};

let registerPromise : Promise<string> | null = null;

//Registers this browser with the backend if it hasn't been already (a returning player's id is
//just read back from localStorage, never re-POSTed) - idempotent, so it's safe to call from
//every place that needs PlayerIdentity.id right before it's actually needed (submitting a run,
//fetching "your rank"), rather than relying on some earlier call having already resolved.
export function EnsureRegistered() : Promise<string> {
    if (PlayerIdentity.id) return Promise.resolve(PlayerIdentity.id);

    try {
        const savedId = localStorage.getItem(ID_STORAGE_KEY);
        if (savedId) {
            PlayerIdentity.id = savedId;
            return Promise.resolve(savedId);
        }
    } catch {
        //Ignore - fall through to registering fresh.
    }

    if (!registerPromise) {
        registerPromise = fetch('/api/players', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({displayName: PlayerIdentity.name}),
        })
            .then(res => {
                if (!res.ok) throw new Error(`Server responded ${res.status}`);
                return res.json();
            })
            .then((dto : PlayerIdentityDto) => {
                PlayerIdentity.id = dto.id;
                try {
                    localStorage.setItem(ID_STORAGE_KEY, dto.id);
                } catch {
                    //Ignore - not critical if this fails.
                }
                return dto.id;
            });
    }
    return registerPromise;
}
