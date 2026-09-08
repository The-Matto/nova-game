import {useEffect, useState} from "react";
import type {PlayerProfile} from "nova-shared/profile";
import type {AuthMeResponse} from "nova-shared/auth";
import {PlayerIdentity, SignInWithGitHub} from "../../../Three/Utility/PlayerIdentity";

const FormatTime = (seconds : number) => `${seconds.toFixed(2)}s`;

//Generic - works for any playerId, not just the current player. Editing is only offered when
//it's genuinely the signed-in caller's own profile (see RenameField) - the server independently
//enforces this too (rename is session-gated, never trusts a client-supplied id).
export const ProfileViewer = ({playerId, onClose} : {playerId : string, onClose : () => void}) => {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/players/profile?playerId=${encodeURIComponent(playerId)}`)
            .then(res => {
                if (!res.ok) throw new Error(`Server responded ${res.status}`);
                return res.json();
            })
            .then(setProfile)
            .catch(() => setError("Couldn't load this profile."));
    }, [playerId]);

    //Deliberately not gated on PlayerIdentity.loggedIn - an anonymous player viewing their own
    //(unclaimed) profile still needs this to be "own", to see the claim-account rundown below.
    const isOwnProfile = playerId === PlayerIdentity.id;

    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50">
        <div className="flex flex-col gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-10 py-8 w-full max-w-2xl max-h-[80vh]">
            {error && <div className="text-red-400 py-6 text-center">{error}</div>}
            {!error && !profile && <div className="text-white/50 py-6 text-center">Loading profile…</div>}

            {profile && <>
                {isOwnProfile && profile.deletionAt === null && <RenameField profile={profile} onRenamed={setProfile} />}
                {isOwnProfile && profile.deletionAt !== null && <>
                    <div className="text-3xl font-bold text-orange-500">{profile.displayName}</div>
                    <AccountClaimNotice deletionAt={profile.deletionAt} />
                </>}
                {!isOwnProfile && <div className="text-3xl font-bold text-orange-500">{profile.displayName}</div>}

                <div className="flex flex-col overflow-y-auto gap-6">
                    <div>
                        <div className="text-lg font-semibold text-orange-500/80 mb-2">Levels created</div>
                        {profile.levels.length === 0
                            ? <div className="text-white/50 text-sm">No levels uploaded yet.</div>
                            : <div className="flex flex-col gap-1">
                                {profile.levels.map(level => (
                                    <div key={level.id} className="flex items-center gap-3 text-white">
                                        <span className="flex-1 truncate">{level.name}</span>
                                        <span className="text-orange-500 text-sm">{level.rating.toFixed(1)}★</span>
                                    </div>
                                ))}
                            </div>}
                    </div>

                    <div>
                        <div className="text-lg font-semibold text-orange-500/80 mb-2">Personal bests</div>
                        {profile.personalBests.length === 0
                            ? <div className="text-white/50 text-sm">No runs recorded yet.</div>
                            : <div className="flex flex-col gap-1">
                                {profile.personalBests.map(pb => (
                                    <div key={pb.levelId} className="flex items-center gap-3 text-white">
                                        <span className="flex-1 truncate">{pb.levelName}</span>
                                        <span className="text-orange-500 text-sm">{FormatTime(pb.timeSeconds)}</span>
                                    </div>
                                ))}
                            </div>}
                    </div>
                </div>
            </>}

            <button
                className="self-start bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-lg text-orange-500/70 cursor-pointer"
                onClick={onClose}
            >
                Back
            </button>
        </div>
    </div>;
};

//Shown on your own profile only while it's still anonymous (deletionAt !== null) - explains why
//and offers the one action that fixes it. No extra confirm step here, unlike AccountSection's
//sign-in button elsewhere - opening your own profile and hitting "Connect GitHub" is already a
//deliberate enough path.
const AccountClaimNotice = ({deletionAt} : {deletionAt : string}) => {
    const daysLeft = Math.max(1, Math.ceil((new Date(deletionAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    return <div className="flex flex-col gap-2 border border-orange-500/30 rounded-xl bg-slate-800/50 px-4 py-3">
        <div className="text-sm text-white/80">
            This account is temporary and will be deleted in {daysLeft} day{daysLeft === 1 ? "" : "s"} unless you
            claim it by linking a login.
        </div>
        <button
            className="self-start bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-orange-500 text-sm cursor-pointer"
            onClick={() => SignInWithGitHub()}
        >
            Connect GitHub
        </button>
    </div>;
};

//Click-to-edit rather than an always-visible input, so a plain profile view (the common case,
//even for your own) doesn't look like a form by default.
const RenameField = ({profile, onRenamed} : {profile : PlayerProfile, onRenamed : (p : PlayerProfile) => void}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(profile.displayName);
    const [saving, setSaving] = useState(false);

    if (!editing) {
        return <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-orange-500">{profile.displayName}</div>
            <button
                className="text-orange-500/60 hover:text-orange-500 text-sm cursor-pointer"
                onClick={() => { setDraft(profile.displayName); setEditing(true); }}
            >
                Edit
            </button>
        </div>;
    }

    const save = () => {
        const trimmed = draft.trim();
        if (!trimmed || saving) return;
        setSaving(true);
        fetch('/api/auth/me', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({displayName: trimmed}),
        })
            .then(res => {
                if (!res.ok) throw new Error(`Server responded ${res.status}`);
                return res.json();
            })
            .then((dto : AuthMeResponse) => {
                if (!dto.displayName) return;
                PlayerIdentity.name = dto.displayName;
                onRenamed({...profile, displayName: dto.displayName});
                setEditing(false);
            })
            .catch(() => {/* Leave the field open on failure so the draft isn't lost. */})
            .finally(() => setSaving(false));
    };

    return <div className="flex items-center gap-3">
        <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            maxLength={40}
            className="text-3xl font-bold text-orange-500 bg-transparent border-b border-orange-500/40 outline-none w-64"
        />
        <button
            className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-orange-500 text-sm cursor-pointer disabled:opacity-50"
            onClick={save}
            disabled={saving}
        >
            Save
        </button>
        <button
            className="text-orange-500/60 hover:text-orange-500 text-sm cursor-pointer"
            onClick={() => setEditing(false)}
        >
            Cancel
        </button>
    </div>;
};
