import {useEffect, useState} from "react";
import type {ReactNode} from "react";
import type {PlayerProfile} from "nova-shared/profile";
import type {AuthMeResponse} from "nova-shared/auth";
import {PlayerIdentity, SignInWithGitHub} from "../../../Three/Utility/PlayerIdentity";
import {QueuePlayLevelAndReload} from "../../../Three/Utility/PlayerGlobals";

const FormatTime = (seconds : number) => `${seconds.toFixed(2)}s`;

//One row shared by "Levels created" and "Personal bests" - thumbnail, name, a caller-supplied
//detail (rating or time), and a Play button that jumps straight into that level.
const ProfileLevelRow = ({thumbnailUrl, name, detail, onPlay} : {
    thumbnailUrl? : string,
    name : string,
    detail : ReactNode,
    onPlay : () => void,
}) => (
    <div className="flex items-center gap-3 text-bone border-b border-ink-700 pb-2">
        {thumbnailUrl
            ? <img src={thumbnailUrl} alt="" className="nv-thumb w-16 h-9 shrink-0" />
            : <div className="nv-thumb w-16 h-9 shrink-0" />}
        <span className="flex-1 truncate font-semibold">{name}</span>
        <span className="font-mono text-ember text-sm shrink-0">{detail}</span>
        <button
            className="nv-btn nv-btn-sm nv-btn-go shrink-0"
            onClick={onPlay}
        >
            Play
        </button>
    </div>
);

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

    return <div className="nv-backdrop fixed inset-0 z-40 flex items-center justify-center">
        <div className="nv-panel flex flex-col gap-4 px-10 py-8 w-full max-w-2xl max-h-[80vh]">
            <div className="nv-label">Player Profile</div>
            {error && <div className="text-blood py-6 text-center">{error}</div>}
            {!error && !profile && <div className="nv-label py-6 text-center">Loading profile…</div>}

            {profile && <>
                {isOwnProfile && profile.deletionAt === null && <RenameField profile={profile} onRenamed={setProfile} />}
                {isOwnProfile && profile.deletionAt !== null && <>
                    <div className="nv-title text-5xl">{profile.displayName}</div>
                    <AccountClaimNotice deletionAt={profile.deletionAt} />
                </>}
                {!isOwnProfile && <div className="nv-title text-5xl">{profile.displayName}</div>}

                <div className="nv-scroll flex flex-col overflow-y-auto gap-6 pr-1">
                    <div>
                        <div className="nv-label mb-2">Levels created</div>
                        {profile.levels.length === 0
                            ? <div className="text-ash text-sm">No levels uploaded yet.</div>
                            : <div className="flex flex-col gap-2">
                                {profile.levels.map(level => (
                                    <ProfileLevelRow
                                        key={level.id}
                                        thumbnailUrl={level.thumbnailUrl}
                                        name={level.name}
                                        detail={`${level.rating.toFixed(1)}★`}
                                        onPlay={() => QueuePlayLevelAndReload({id: level.id, path: level.path})}
                                    />
                                ))}
                            </div>}
                    </div>

                    <div>
                        <div className="nv-label mb-2">Personal bests</div>
                        {profile.personalBests.length === 0
                            ? <div className="text-ash text-sm">No runs recorded yet.</div>
                            : <div className="flex flex-col gap-2">
                                {profile.personalBests.map(pb => (
                                    <ProfileLevelRow
                                        key={pb.levelId}
                                        thumbnailUrl={pb.thumbnailUrl}
                                        name={pb.levelName}
                                        detail={FormatTime(pb.timeSeconds)}
                                        onPlay={() => QueuePlayLevelAndReload({id: pb.levelId, path: pb.levelPath})}
                                    />
                                ))}
                            </div>}
                    </div>
                </div>
            </>}

            <button
                className="nv-btn self-start"
                onClick={onClose}
            >
                ← Back
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
    return <div className="flex flex-col gap-2 border-l-2 border-ember bg-ember/10 px-4 py-3">
        <div className="text-sm text-bone">
            This account is temporary and will be deleted in {daysLeft} day{daysLeft === 1 ? "" : "s"} unless you
            claim it by linking a login.
        </div>
        <button
            className="nv-btn nv-btn-primary nv-btn-sm self-start"
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
            <div className="nv-title text-5xl">{profile.displayName}</div>
            <button
                className="nv-btn nv-btn-ghost nv-btn-sm"
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
            className="nv-input text-2xl font-bold w-72"
        />
        <button
            className="nv-btn nv-btn-primary nv-btn-sm"
            onClick={save}
            disabled={saving}
        >
            Save
        </button>
        <button
            className="nv-btn nv-btn-ghost nv-btn-sm"
            onClick={() => setEditing(false)}
        >
            Cancel
        </button>
    </div>;
};
