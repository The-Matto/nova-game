import {useEffect, useState} from "react";
import type {LevelSummary} from "nova-shared/level-listing";
import {LEVEL_TAGS} from "nova-shared/level-tags";
import type {LevelTag} from "nova-shared/level-tags";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";
import {LevelLeaderboardPreview} from "./LevelLeaderboardPreview";
import {AccountSection} from "./AccountSection";

//Small pill used both for a level's own tags and the filter row - same look, different context.
const TagPill = ({tag, active, onClick} : {tag : string, active? : boolean, onClick? : () => void}) => {
    const className = `text-xs px-2 py-0.5 rounded-full ${
        active ? "bg-orange-500 text-slate-950" : "bg-slate-800 text-orange-500/70"
    } ${onClick ? "cursor-pointer hover:text-orange-500" : ""}`;
    return onClick
        ? <button onClick={onClick} className={className}>{tag}</button>
        : <span className={className}>{tag}</span>;
};

//Star rating rendered as filled/empty glyphs plus the raw number - good enough without needing
//an icon font.
const RatingStars = ({rating} : {rating : number}) => {
    const filled = Math.round(rating);
    return <span className="text-orange-500">
        {"★".repeat(filled)}{"☆".repeat(5 - filled)}
        <span className="text-white/50 text-sm ml-1">{rating.toFixed(1)}</span>
    </span>;
};

//Only shown on a level the current player authored, once its row is expanded (collapsed rows sit
//too close together for the dropdown to fit without getting clipped) - a ⋮ button opening Edit/
//Delete. Delete is gated behind an inline confirm, unlike EditorLevelStorageModal's local saves.
const LevelOwnerMenu = ({onEdit, onConfirmDelete} : {onEdit : () => void, onConfirmDelete : () => Promise<void>}) => {
    const [open, setOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(false);

    const close = () => { setOpen(false); setConfirming(false); setError(false); };

    const doDelete = async () => {
        setDeleting(true);
        try {
            await onConfirmDelete();
        } catch {
            setDeleting(false);
            setError(true);
            return;
        }
        close();
    };

    return <div className="relative">
        <button
            onClick={() => (open ? close() : setOpen(true))}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-950/70 hover:bg-slate-800 text-white text-sm cursor-pointer"
        >
            ⋮
        </button>

        {open && (
            <div className="absolute top-8 right-0 bg-slate-800 rounded-lg overflow-hidden text-xs z-20 w-40 shadow-lg">
                {!confirming ? (
                    <>
                        <button
                            className="block w-full px-3 py-2 text-left text-orange-100 hover:bg-slate-700 cursor-pointer"
                            onClick={onEdit}
                        >
                            Edit Level
                        </button>
                        <button
                            className="block w-full px-3 py-2 text-left text-red-400 hover:bg-slate-700 cursor-pointer"
                            onClick={() => setConfirming(true)}
                        >
                            Delete Level
                        </button>
                    </>
                ) : (
                    <div className="px-3 py-2 flex flex-col gap-2">
                        <div className="text-white/80">Delete permanently?</div>
                        {error && <div className="text-red-400">Couldn't delete - try again.</div>}
                        <div className="flex gap-2">
                            <button
                                className="flex-1 bg-red-700 hover:bg-red-600 rounded px-2 py-1 text-white cursor-pointer disabled:opacity-50"
                                onClick={doDelete}
                                disabled={deleting}
                            >
                                {deleting ? "…" : "Delete"}
                            </button>
                            <button
                                className="flex-1 bg-slate-700 hover:bg-slate-600 rounded px-2 py-1 text-white/70 cursor-pointer"
                                onClick={close}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>;
};

//Client-side only for now - fine at the current level count, would want a real ?search=&page=
//API instead once there are enough levels for "fetch everything up front" to actually cost
//something.
const PAGE_SIZE = 10;

type SortMode = 'default' | 'popular' | 'new';

const SORT_OPTIONS : {mode : SortMode, label : string}[] = [
    {mode: 'popular', label: '🔥 Popular this week'},
    {mode: 'new', label: '🆕 New'},
];

//Shown after clicking Play - list of community levels, fetched from the
//backend's REST API. Only "Test World" exists for now (see LevelsApi.ts on the server), but the
//list itself is already real, not a placeholder.
export const LevelBrowser = ({onSelectLevel, onEditLevel, onBack} : {
    onSelectLevel : (level : LevelSummary) => void,
    onEditLevel : (level : LevelSummary) => void,
    onBack : () => void,
}) => {

    const [levels, setLevels] = useState<LevelSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    //Accordion - only one level's leaderboard preview is expanded at a time.
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedTags, setSelectedTags] = useState<LevelTag[]>([]);
    const [sortMode, setSortMode] = useState<SortMode>('default');
    const [page, setPage] = useState(0);
    const [myLevelsOnly, setMyLevelsOnly] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);

    useEffect(() => {
        EnsureRegistered().then(setPlayerId);
    }, []);

    const toggleTag = (tag : LevelTag) => {
        setSelectedTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
        setPage(0);
    };

    const toggleSort = (mode : SortMode) => {
        setSortMode(current => current === mode ? 'default' : mode);
        setPage(0);
    };

    const deleteLevel = async (levelId : string) => {
        if (!playerId) throw new Error("Not registered yet");
        const res = await fetch('/api/levels', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({levelId, playerId}),
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        setLevels(current => current?.filter(l => l.id !== levelId) ?? null);
    };

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
    //Tag filter is OR - a level matches if it has any of the selected tags, not all of them.
    const filteredLevels = levels?.filter(level =>
        level.name.toLowerCase().includes(query)
        && (selectedTags.length === 0 || selectedTags.some(tag => level.tags.includes(tag)))
        && (!myLevelsOnly || level.authorId === playerId)
    ) ?? null;
    const sortedLevels = filteredLevels && [...filteredLevels].sort((a, b) => {
        if (sortMode === 'popular') return b.weeklyPlays - a.weeklyPlays;
        if (sortMode === 'new') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        return 0;
    });
    const pageCount = sortedLevels ? Math.max(1, Math.ceil(sortedLevels.length / PAGE_SIZE)) : 1;
    //Clamped rather than reset outright - keeps you on a sensible page if a search shrinks the
    //result count out from under the current one, instead of always snapping back to page 1.
    const clampedPage = Math.min(page, pageCount - 1);
    const pagedLevels = sortedLevels?.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE) ?? null;

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

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/40">Sort:</span>
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.mode}
                            onClick={() => toggleSort(opt.mode)}
                            className={`text-xs px-2.5 py-1 rounded-full cursor-pointer ${
                                sortMode === opt.mode ? "bg-orange-500 text-slate-950" : "bg-slate-800 text-orange-500/70 hover:text-orange-500"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => { setMyLevelsOnly(current => !current); setPage(0); }}
                    className={`text-xs px-2.5 py-1 rounded-full cursor-pointer ${
                        myLevelsOnly ? "bg-orange-500 text-slate-950" : "bg-slate-800 text-orange-500/70 hover:text-orange-500"
                    }`}
                >
                    👤 My Levels
                </button>
                <div className="flex flex-wrap gap-1.5">
                    {LEVEL_TAGS.map(tag => (
                        <TagPill key={tag} tag={tag} active={selectedTags.includes(tag)} onClick={() => toggleTag(tag)} />
                    ))}
                </div>
            </div>

            <div className="flex flex-col overflow-y-auto">
                {error && <div className="text-red-400 py-6 text-center">{error}</div>}
                {!error && !levels && <div className="text-white/50 py-6 text-center">Loading levels…</div>}
                {!error && levels?.length === 0 && <div className="text-white/50 py-6 text-center">No levels yet.</div>}
                {!error && levels && levels.length > 0 && filteredLevels?.length === 0 && (
                    <div className="text-white/50 py-6 text-center">No levels match the current filters.</div>
                )}

                {pagedLevels?.map(level => {
                    const isExpanded = expandedId === level.id;
                    const isOwnLevel = playerId !== null && level.authorId === playerId;
                    return <div key={level.id} className="rounded-xl overflow-hidden">
                        <div className="relative">
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : level.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3 text-left cursor-pointer ${isOwnLevel && isExpanded ? "pr-12" : ""} ${isExpanded ? "bg-orange-500/15" : "hover:bg-slate-800"}`}
                            >
                                {level.thumbnailUrl
                                    ? <img src={level.thumbnailUrl} alt="" className="w-24 h-14 object-cover rounded-lg bg-slate-800" />
                                    : <div className="w-24 h-14 rounded-lg bg-slate-800" />}
                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div className="text-xl text-white font-semibold truncate">{level.name}</div>
                                    {level.tags.length > 0 && <div className="flex flex-wrap gap-1">
                                        {level.tags.map(tag => <TagPill key={tag} tag={tag} />)}
                                    </div>}
                                </div>
                                <div className="w-32 text-white/70 text-sm">by {level.createdBy}</div>
                                <div className="w-32"><RatingStars rating={level.rating} /></div>
                                <div className="w-20 text-orange-500/70 text-sm">
                                    {level.weeklyPlays > 0 && `🔥 ${level.weeklyPlays}`}
                                </div>
                                <div className="w-24 text-white/50 text-sm text-right">
                                    {new Date(level.uploadedAt).toLocaleDateString()}
                                </div>
                            </button>

                            {isOwnLevel && isExpanded && (
                                <div className="absolute top-1/2 -translate-y-1/2 right-3">
                                    <LevelOwnerMenu onEdit={() => onEditLevel(level)} onConfirmDelete={() => deleteLevel(level.id)} />
                                </div>
                            )}
                        </div>

                        {isExpanded && <div className="flex gap-6 px-6 pb-6 pt-2 bg-slate-800/50">
                            {level.thumbnailUrl
                                ? <img src={level.thumbnailUrl} alt="" className="w-64 h-36 object-cover rounded-lg bg-slate-900 shrink-0" />
                                : <div className="w-64 h-36 rounded-lg bg-slate-900 shrink-0" />}
                            <div className="flex-1 min-w-0">
                                {level.description && <div className="text-sm text-white/70 mb-3">{level.description}</div>}
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
