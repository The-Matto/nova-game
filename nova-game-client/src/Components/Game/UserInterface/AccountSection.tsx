import {useEffect, useState} from "react";
import {PlayerIdentity, RefreshAuthState, SignInWithGitHub, SignOutOfGitHub} from "../../../Three/Utility/PlayerIdentity";

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

//PlayerIdentity itself isn't reactive - this pulls a fresh snapshot on mount (there's no active
//session state before then) and re-renders locally after sign-in/out rather than relying on
//PlayerIdentity's fields changing to trigger it.
export const AccountSection = () => {
    const [loggedIn, setLoggedIn] = useState(PlayerIdentity.loggedIn);
    const [name, setName] = useState(PlayerIdentity.name);
    const [loading, setLoading] = useState(true);
    const [showSignInConfirm, setShowSignInConfirm] = useState(false);

    useEffect(() => {
        RefreshAuthState().finally(() => {
            setLoggedIn(PlayerIdentity.loggedIn);
            setName(PlayerIdentity.name);
            setLoading(false);
        });
    }, []);

    if (loading) return null;

    return <>
        {showSignInConfirm && <SignInConfirm onCancel={() => setShowSignInConfirm(false)} />}
        <div className="absolute top-4 right-4 flex items-center gap-3 text-orange-500 text-sm">
            {loggedIn
                ? <>
                    <span>Signed in as {name}</span>
                    <button
                        className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                        onClick={() => SignOutOfGitHub().then(() => { setLoggedIn(false); setName(PlayerIdentity.name); })}
                    >
                        Sign out
                    </button>
                </>
                : <>
                    <span>Playing as {name}</span>
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
