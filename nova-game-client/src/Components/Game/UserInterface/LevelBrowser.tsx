import {useEffect, useState} from "react";
import type {LevelSummary} from "nova-shared/level-listing";

//Star rating rendered as filled/empty glyphs plus the raw number - good enough without needing
//an icon font.
const RatingStars = ({rating} : {rating : number}) => {
    const filled = Math.round(rating);
    return <span className="text-orange-500">
        {"★".repeat(filled)}{"☆".repeat(5 - filled)}
        <span className="text-white/50 text-sm ml-1">{rating.toFixed(1)}</span>
    </span>;
};

//Shown after clicking Play - a Happy Wheels-style list of community levels, fetched from the
//backend's REST API. Only "Test World" exists for now (see LevelsApi.ts on the server), but the
//list itself is already real, not a placeholder.
export const LevelBrowser = ({onSelectLevel, onBack} : {
    onSelectLevel : (level : LevelSummary) => void,
    onBack : () => void,
}) => {

    const [levels, setLevels] = useState<LevelSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/levels')
            .then(res => {
                if (!res.ok) throw new Error(`Server responded ${res.status}`);
                return res.json();
            })
            .then(setLevels)
            .catch(() => setError("Couldn't reach the level server - is it running?"));
    }, []);

    return <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-10 py-8 w-full max-w-4xl max-h-[80vh]">
            <div className="text-3xl font-bold text-orange-500">Select Level</div>

            <div className="flex flex-col overflow-y-auto">
                {error && <div className="text-red-400 py-6 text-center">{error}</div>}
                {!error && !levels && <div className="text-white/50 py-6 text-center">Loading levels…</div>}
                {!error && levels?.length === 0 && <div className="text-white/50 py-6 text-center">No levels yet.</div>}

                {levels?.map(level => (
                    <button
                        key={level.id}
                        onClick={() => onSelectLevel(level)}
                        className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800 text-left cursor-pointer"
                    >
                        {level.thumbnailUrl
                            ? <img src={level.thumbnailUrl} alt="" className="w-24 h-14 object-cover rounded-lg bg-slate-800" />
                            : <div className="w-24 h-14 rounded-lg bg-slate-800" />}
                        <div className="flex-1 min-w-0 text-xl text-white font-semibold truncate">{level.name}</div>
                        <div className="w-32 text-white/70 text-sm">by {level.createdBy}</div>
                        <div className="w-32"><RatingStars rating={level.rating} /></div>
                        <div className="w-24 text-white/50 text-sm text-right">
                            {new Date(level.uploadedAt).toLocaleDateString()}
                        </div>
                    </button>
                ))}
            </div>

            <button
                className="self-start bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-lg text-orange-500/70 cursor-pointer"
                onClick={onBack}
            >
                Back
            </button>
        </div>
    </div>;
};
