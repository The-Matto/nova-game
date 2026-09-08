import type {PlayerIdentityDto} from "nova-shared/player";
import type {AuthMeResponse} from "nova-shared/auth";

const NAME_STORAGE_KEY = 'nova-game:player-name';
const ID_STORAGE_KEY = 'nova-game:player-id';

function GenerateRandomName() : string {
    return `Player${Math.floor(1000 + Math.random() * 9000)}`;
}

//A stable per-browser display name, generated once and remembered locally - same idea as
//PlayerSettings' persistence. Shown instantly, with no network dependency.
function LoadOrCreateName() : string {
    try {
        const saved = localStorage.getItem(NAME_STORAGE_KEY);
        if (saved) return saved;
    } catch {
        //Ignore - fall through to a fresh name.
    }

    const name = GenerateRandomName();
    try {
        localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
        //Ignore - not critical if this fails.
    }
    return name;
}

export const PlayerIdentity = {
    name: LoadOrCreateName(),
    //Set once EnsureRegistered() resolves - null until then. Stays the same id across
    //anonymous -> GitHub-linked (see RefreshAuthState) - linking upgrades this id, never
    //replaces it, so existing history (leaderboard entries, uploaded levels) carries over.
    id: null as string | null,
    //Whether the current browser session has a valid GitHub-linked cookie right now - just for
    //UI display (see OptionsMenu's account section); the server independently verifies this
    //itself for anything security-relevant, never trusts this flag.
    loggedIn: false,
    email: undefined as string | undefined,
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

//Checks the current session cookie against the server and syncs PlayerIdentity to match - call
//whenever the UI needs to know real login state (there's no push notification for this, so it's
//pull-on-demand, e.g. on the account section mounting).
export async function RefreshAuthState() : Promise<void> {
    const res = await fetch('/api/auth/me');
    const dto : AuthMeResponse = await res.json();

    PlayerIdentity.loggedIn = dto.loggedIn;
    PlayerIdentity.email = dto.email;
    if (dto.loggedIn && dto.id && dto.displayName) {
        PlayerIdentity.id = dto.id;
        PlayerIdentity.name = dto.displayName;
        try {
            localStorage.setItem(ID_STORAGE_KEY, dto.id);
            localStorage.setItem(NAME_STORAGE_KEY, dto.displayName);
        } catch {
            //Ignore - not critical if this fails.
        }
    }
}

//A real navigation, not a fetch - GitHub's consent screen has to be the top-level page. Comes
//back to this same page via /api/auth/github/callback's redirect once done.
export async function SignInWithGitHub() : Promise<void> {
    const id = await EnsureRegistered();
    window.location.href = `/api/auth/github/login?playerId=${encodeURIComponent(id)}`;
}

//A full reset, not just clearing the session - otherwise this browser would keep acting as the
//linked account (same id, same name) even though it no longer has a session proving that. Mints
//a brand new anonymous identity, same as a first-ever visit; signing back in still resolves back
//to the real linked account (that link is permanent server-side), nothing is lost by this.
export async function SignOutOfGitHub() : Promise<void> {
    await fetch('/api/auth/logout', {method: 'POST'});

    const freshName = GenerateRandomName();
    PlayerIdentity.id = null;
    PlayerIdentity.name = freshName;
    PlayerIdentity.loggedIn = false;
    PlayerIdentity.email = undefined;
    registerPromise = null;

    try {
        localStorage.setItem(NAME_STORAGE_KEY, freshName);
        localStorage.removeItem(ID_STORAGE_KEY);
    } catch {
        //Ignore - not critical if this fails.
    }

    await EnsureRegistered();
}
