import {useEffect, useState} from "react";
import {PlayerIdentity, RefreshAuthState, SignInWithGitHub, SignOutOfGitHub} from "../../../Three/Utility/PlayerIdentity";

//PlayerIdentity itself isn't reactive - this pulls a fresh snapshot on mount (there's no active
//session state before then) and re-renders locally after sign-in/out rather than relying on
//PlayerIdentity's fields changing to trigger it.
export const AccountSection = () => {
    const [loggedIn, setLoggedIn] = useState(PlayerIdentity.loggedIn);
    const [name, setName] = useState(PlayerIdentity.name);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        RefreshAuthState().finally(() => {
            setLoggedIn(PlayerIdentity.loggedIn);
            setName(PlayerIdentity.name);
            setLoading(false);
        });
    }, []);

    if (loading) return null;

    return <div className="absolute top-4 right-4 flex items-center gap-3 text-orange-500 text-sm">
        {loggedIn
            ? <>
                <span>Signed in as {name}</span>
                <button
                    className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                    onClick={() => SignOutOfGitHub().then(() => setLoggedIn(false))}
                >
                    Sign out
                </button>
            </>
            : <>
                <span>Playing as {name}</span>
                <button
                    className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                    onClick={() => SignInWithGitHub()}
                >
                    Sign in with GitHub
                </button>
            </>
        }
    </div>;
};
