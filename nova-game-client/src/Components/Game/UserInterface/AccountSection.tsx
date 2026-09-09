import {useEffect, useState} from "react";
import type {AuthMeResponse} from "nova-shared/auth";
import type {PlayerProfile} from "nova-shared/profile";
import {EnsureRegistered, PlayerIdentity, RefreshAuthState, SignInWithGitHub, SignOutOfGitHub} from "../../../Three/Utility/PlayerIdentity";
import {ProfileViewer} from "./ProfileViewer";

//Rounded up so "less than a day left" still reads as 1, not 0 - 0 would look like it's already
//too late.
const DaysUntil = (isoDate : string) : number =>
    Math.max(1, Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

//GitHub silently skips its own consent screen for an already-authorized app (no equivalent of
//Google's prompt=consent to force it back) - this stands in for that missing "are you sure"
//moment, so signing in is never a single accidental click.
const SignInConfirm = ({onCancel} : {onCancel : () => void}) => (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/25">
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-10 py-8">
            <div className="text-2xl font-bold text-orange-500">Sign in with GitHub?</div>
            <div className="text-sm text-orange-500/80">You'll be sent to github.com to authorize Nova Game.</div>
            <div className="flex gap-4 mt-2">
                <button
                    className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-orange-500 cursor-pointer"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-orange-500 cursor-pointer"
                    onClick={() => SignInWithGitHub()}
                >
                    Continue
                </button>
            </div>
        </div>
    </div>
);

//Shown once, right after a first-ever GitHub link (see AuthApi.ts's ?welcome=1 redirect) -
//pre-filled with whatever name was carried over, so hitting Continue immediately is a valid
//choice too, not just a placeholder blocking submission.
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

    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50">
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-10 py-8">
            <div className="text-2xl font-bold text-orange-500">Welcome! Choose a username</div>
            <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") save(); }}
                maxLength={40}
                className="text-xl text-orange-500 bg-transparent border-b border-orange-500/40 outline-none w-64 text-center"
            />
            <button
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-orange-500 cursor-pointer disabled:opacity-50"
                onClick={save}
                disabled={saving}
            >
                Continue
            </button>
        </div>
    </div>;
};

//PlayerIdentity itself isn't reactive - this pulls a fresh snapshot on mount (there's no active
//session state before then) and re-renders locally after sign-in/out rather than relying on
//PlayerIdentity's fields changing to trigger it.
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
        <div className="absolute top-4 right-4 flex items-center gap-3 text-orange-500 text-sm border border-orange-500/40 rounded-xl bg-slate-900/80 px-4 py-2">
            {loggedIn
                ? <>
                    <span>Signed in as <button className="underline cursor-pointer" onClick={openOwnProfile}>{name}</button></span>
                    <button
                        className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                        onClick={() => SignOutOfGitHub().then(() => { setLoggedIn(false); setName(PlayerIdentity.name); })}
                    >
                        Sign out
                    </button>
                </>
                : <>
                    <span>Playing as <button className="underline cursor-pointer" onClick={openOwnProfile}>{name}</button></span>
                    {daysLeft !== null && (
                        <span className="text-orange-500/60">{daysLeft} day{daysLeft === 1 ? "" : "s"} left to claim account</span>
                    )}
                    <button
                        className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                        onClick={() => setShowSignInConfirm(true)}
                    >
                        Sign in with GitHub
                    </button>
                </>
            }
        </div>
    </>;
};
