import {useEffect, useState} from "react";
import type {LevelSummary} from "nova-shared/level-listing";
import {LevelLeaderboardPreview} from "./LevelLeaderboardPreview";
import {AccountSection} from "./AccountSection";

//Star rating rendered as filled/empty glyphs plus the raw number - good enough without needing
//an icon font.
const RatingStars = ({rating} : {rating : number}) => {
    const filled = Math.round(rating);
    return <span className="text-orange-500">
        {"★".repeat(filled)}{"☆".repeat(5 - filled)}
        <span className="text-white/50 text-sm ml-1">{rating.toFixed(1)}</span>
    </span>;
};

//Client-side only for now - fine at the current level count, would want a real ?search=&page=
//API instead once there are enough levels for "fetch everything up front" to actually cost
//something.
const PAGE_SIZE = 10;

//Shown after clicking Play - a Happy Wheels-style list of community levels, fetched from the
//backend's REST API. Only "Test World" exists for now (see LevelsApi.ts on the server), but the
//list itself is already real, not a placeholder.
export const LevelBrowser = ({onSelectLevel, onBack} : {
    onSelectLevel : (level : LevelSummary) => void,
    onBack : () => void,
}) => {

    const [levels, setLevels] = useState<LevelSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    //Accordion - only one level's leaderboard preview is expanded at a time.
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);

    useEffect(() => {
        fetch('/api/levels')
            .then(res => {
                if (!res.ok) throw new Error(`Server responded ${res.status}`);
                return res.json();
            })
            .then(setLevels)
            .catch(() => setError("Couldn't reach the level server - is it running?"));
    }, []);

    const query = search.trim().toLowerCase();
    const filteredLevels = levels?.filter(level => level.name.toLowerCase().includes(query)) ?? null;
    const pageCount = filteredLevels ? Math.max(1, Math.ceil(filteredLevels.length / PAGE_SIZE)) : 1;
    //Clamped rather than reset outright - keeps you on a sensible page if a search shrinks the
    //result count out from under the current one, instead of always snapping back to page 1.
    const clampedPage = Math.min(page, pageCount - 1);
    const pagedLevels = filteredLevels?.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE) ?? null;

    return <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <AccountSection />
        <div className="flex flex-col gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-10 py-8 w-full max-w-6xl max-h-[90vh]">
            <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-orange-500">Select Level</div>
                <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                    placeholder="Search by name..."
                    className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none text-sm"
                />
            </div>

            <div className="flex flex-col overflow-y-auto">
                {error && <div className="text-red-400 py-6 text-center">{error}</div>}
                {!error && !levels && <div className="text-white/50 py-6 text-center">Loading levels…</div>}
                {!error && levels?.length === 0 && <div className="text-white/50 py-6 text-center">No levels yet.</div>}
                {!error && levels && levels.length > 0 && filteredLevels?.length === 0 && (
                    <div className="text-white/50 py-6 text-center">No levels match "{search.trim()}".</div>
                )}

                {pagedLevels?.map(level => {
                    const isExpanded = expandedId === level.id;
                    return <div key={level.id} className="rounded-xl overflow-hidden">
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : level.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 text-left cursor-pointer ${isExpanded ? "bg-orange-500/15" : "hover:bg-slate-800"}`}
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

                        {isExpanded && <div className="flex gap-6 px-6 pb-6 pt-2 bg-slate-800/50">
                            {level.thumbnailUrl
                                ? <img src={level.thumbnailUrl} alt="" className="w-64 h-36 object-cover rounded-lg bg-slate-900 shrink-0" />
                                : <div className="w-64 h-36 rounded-lg bg-slate-900 shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <LevelLeaderboardPreview levelId={level.id} />
                            </div>
                            <button
                                className="self-end bg-emerald-700 hover:bg-emerald-600 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer shrink-0"
                                onClick={() => onSelectLevel(level)}
                            >
                                Play
                            </button>
                        </div>}
                    </div>;
                })}
            </div>

            {pageCount > 1 && (
                <div className="flex items-center justify-center gap-4 text-orange-500">
                    <button
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-default rounded-lg px-3 py-1.5 text-sm cursor-pointer"
                        onClick={() => setPage(clampedPage - 1)}
                        disabled={clampedPage === 0}
                    >
                        ← Prev
                    </button>
                    <div className="text-sm text-white/50">Page {clampedPage + 1} of {pageCount}</div>
                    <button
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-default rounded-lg px-3 py-1.5 text-sm cursor-pointer"
                        onClick={() => setPage(clampedPage + 1)}
                        disabled={clampedPage >= pageCount - 1}
                    >
                        Next →
                    </button>
                </div>
            )}

            <button
                className="self-start bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-lg text-orange-500/70 cursor-pointer"
                onClick={onBack}
            >
                Back
            </button>
        </div>
    </div>;
};
