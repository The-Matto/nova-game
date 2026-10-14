import {useEffect, useState} from "react";
import type {AuthMeResponse} from "nova-shared/auth";
import type {PlayerProfile} from "nova-shared/profile";
import {EnsureRegistered, PlayerIdentity, RefreshAuthState, SignInWithGitHub, SignOutOfGitHub} from "../../../Three/Utility/PlayerIdentity";
import {ProfileViewer} from "./ProfileViewer";

//Rounded up so "less than a day left" still reads as 1, not 0 - 0 would look like it's already
//too late.
const DaysUntil = (isoDate : string) : number =>
    Math.max(1, Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

//GitHub silently skips its own consent screen for an already-authorized app - this stands in
//for that missing "are you sure" moment, so signing in is never a single accidental click.
const SignInConfirm = ({onCancel} : {onCancel : () => void}) => (
    <div className="nv-backdrop fixed inset-0 z-30 flex items-center justify-center">
        <div className="nv-panel flex flex-col items-center gap-4 px-10 py-8">
            <div className="nv-title text-4xl">Sign in with GitHub?</div>
            <div className="text-sm text-ash">You'll be sent to github.com to authorize Nova Game.</div>
            <div className="flex gap-4 mt-2">
                <button
                    className="nv-btn"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    className="nv-btn nv-btn-primary"
                    onClick={() => SignInWithGitHub()}
                >
                    Continue
                </button>
            </div>
        </div>
    </div>
);

//Shown once, right after a first-ever GitHub link (see AuthApi.ts's ?welcome=1 redirect) -
//pre-filled so hitting Continue immediately is a valid choice too.
const WelcomePrompt = ({onDone} : {onDone : (name : string) => void}) => {
    const [draft, setDraft] = useState(PlayerIdentity.name);
    const [saving, setSaving] = useState(false);

    const save = () => {
        const trimmed = draft.trim();
        if (!trimmed || saving) return;
        setSaving(true);
        fetch('/api/auth/me', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({displayName: trimmed}),
        })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then((dto : AuthMeResponse) => {
                if (dto.displayName) PlayerIdentity.name = dto.displayName;
                onDone(dto.displayName ?? PlayerIdentity.name);
            })
            .catch(() => onDone(PlayerIdentity.name))
            .finally(() => setSaving(false));
    };

    return <div className="nv-backdrop fixed inset-0 z-40 flex items-center justify-center">
        <div className="nv-panel flex flex-col items-center gap-4 px-10 py-8">
            <div className="nv-label">Welcome to Nova</div>
            <div className="nv-title text-4xl">Choose a username</div>
            <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") save(); }}
                maxLength={40}
                className="nv-input text-xl w-72 text-center"
            />
            <button
                className="nv-btn nv-btn-primary nv-btn-lg"
                onClick={save}
                disabled={saving}
            >
                Continue
            </button>
        </div>
    </div>;
};

//PlayerIdentity itself isn't reactive - this pulls a fresh snapshot on mount and re-renders
//locally after sign-in/out instead.
export const AccountSection = () => {
    const [loggedIn, setLoggedIn] = useState(PlayerIdentity.loggedIn);
    const [name, setName] = useState(PlayerIdentity.name);
    const [loading, setLoading] = useState(true);
    const [showSignInConfirm, setShowSignInConfirm] = useState(false);
    const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
    const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    useEffect(() => {
        RefreshAuthState().finally(() => {
            setLoggedIn(PlayerIdentity.loggedIn);
            setName(PlayerIdentity.name);
            setLoading(false);

            //?welcome=1 only appears right after a first-ever GitHub link (see AuthApi.ts) - strip
            //it immediately so a refresh doesn't re-trigger this.
            if (PlayerIdentity.loggedIn && new URLSearchParams(window.location.search).get('welcome') === '1') {
                setShowWelcomePrompt(true);
                const url = new URL(window.location.href);
                url.searchParams.delete('welcome');
                window.history.replaceState({}, '', url);
            }

            //Only anonymous accounts have a deletion deadline - a claimed one already came back
            //with loggedIn true above, no need to ask.
            if (!PlayerIdentity.loggedIn) {
                EnsureRegistered()
                    .then(id => fetch(`/api/players/profile?playerId=${encodeURIComponent(id)}`))
                    .then(res => res.ok ? res.json() : Promise.reject())
                    .then((profile : PlayerProfile) => {
                        if (profile.deletionAt) setDaysLeft(DaysUntil(profile.deletionAt));
                    })
                    .catch(() => {/* Not critical - the corner hint just won't show. */});
            }
        });
    }, []);

    if (loading) return null;

    //Anonymous players may not have registered yet (that's normally lazy - see EnsureRegistered's
    //own doc comment), so this resolves an id before opening the profile rather than assuming one.
    const openOwnProfile = () => { EnsureRegistered().then(setProfilePlayerId); };

    return <>
        {showSignInConfirm && <SignInConfirm onCancel={() => setShowSignInConfirm(false)} />}
        {profilePlayerId && <ProfileViewer playerId={profilePlayerId} onClose={() => setProfilePlayerId(null)} />}
        {showWelcomePrompt && <WelcomePrompt onDone={newName => { setName(newName); setShowWelcomePrompt(false); }} />}
        <div className="absolute top-4 right-4 flex items-center gap-3 text-bone text-sm border-l-2 border-molten bg-ink-900/90 pl-4 pr-2 py-2">
            {loggedIn
                ? <>
                    <span className="text-ash">Signed in as <button className="font-bold text-bone hover:text-molten cursor-pointer" onClick={openOwnProfile}>{name}</button></span>
                    <button
                        className="nv-btn nv-btn-sm"
                        onClick={() => SignOutOfGitHub().then(() => { setLoggedIn(false); setName(PlayerIdentity.name); })}
                    >
                        Sign out
                    </button>
                </>
                : <>
                    <span className="text-ash">Playing as <button className="font-bold text-bone hover:text-molten cursor-pointer" onClick={openOwnProfile}>{name}</button></span>
                    {daysLeft !== null && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ember">{daysLeft} day{daysLeft === 1 ? "" : "s"} left to claim account</span>
                    )}
                    <button
                        className="nv-btn nv-btn-sm"
                        onClick={() => setShowSignInConfirm(true)}
                    >
                        Sign in with GitHub
                    </button>
                </>
            }
        </div>
    </>;
};
