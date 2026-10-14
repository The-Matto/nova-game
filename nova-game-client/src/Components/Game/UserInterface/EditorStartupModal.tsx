import {useEffect, useState} from "react";
import type {LevelSummary} from "nova-shared/level-listing";
import {NVScene} from "../../../Three/NVScene";
import {EditingLevel, EditorState, LevelSelection} from "../../../Three/Utility/PlayerGlobals";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";
import {ListSavedLevels, type SavedLevel} from "../../../Three/Editor/EditorLevelStorage";
import {ListLevelPresets, type LevelPreset} from "../../../Three/Editor/LevelPresets";

type Tab = 'presets' | 'saves' | 'uploads';

const TABS : {tab : Tab, label : string}[] = [
    {tab: 'presets', label: 'Presets'},
    {tab: 'saves', label: 'My Saves'},
    {tab: 'uploads', label: 'My Uploads'},
];

//One tile per level, regardless of which of the three sources it came from - just a thumbnail
//(optional - a preset without one just falls back to "No preview") and a name.
const LevelTile = ({name, thumbnailSrc, onClick} : {name : string, thumbnailSrc? : string, onClick : () => void}) => (
    <button
        className="group flex flex-col gap-1 text-left cursor-pointer"
        onClick={onClick}
    >
        {thumbnailSrc
            ? <img src={thumbnailSrc} alt="" className="nv-thumb w-full aspect-video group-hover:border-molten" />
            : <div className="nv-thumb w-full aspect-video flex items-center justify-center nv-label group-hover:border-molten">No preview</div>}
        <div className="text-sm font-semibold uppercase tracking-wide text-bone group-hover:text-molten truncate">{name}</div>
    </button>
);

//Opens the instant a fresh editor session starts - lets you pick a real starting point instead
//of always editing a blank level. Skipped when EditingLevel.id is already set (see EditorMenu).
export const EditorStartupModal = ({onClose} : {onClose : () => void}) => {
    const [tab, setTab] = useState<Tab>('presets');

    const [presets, setPresets] = useState<LevelPreset[] | null>(null);
    const [saves, setSaves] = useState<SavedLevel[]>([]);
    const [uploads, setUploads] = useState<LevelSummary[] | null>(null);
    const [uploadsError, setUploadsError] = useState<string | null>(null);

    useEffect(() => {
        ListLevelPresets().then(setPresets);
        setSaves(ListSavedLevels());
        EnsureRegistered()
            .then(playerId => fetch('/api/levels')
                .then(res => {
                    if (!res.ok) throw new Error(`Server responded ${res.status}`);
                    return res.json();
                })
                .then((levels : LevelSummary[]) => setUploads(levels.filter(l => l.authorId === playerId))))
            .catch(() => setUploadsError("Couldn't reach the level server"));
    }, []);

    const loadPreset = async (preset : LevelPreset) => {
        await NVScene.LoadLevelFromPath(`/level-presets/${preset.file}`);
        onClose();
    };

    const loadSave = (save : SavedLevel) => {
        NVScene.LoadFromSnapshot(save.levelData);
        EditorState.isDirty = false;
        onClose();
    };

    //Same as MainMenu's own "Edit Level" - remembers which upload this is so Upload later offers
    //"Update" instead of only ever creating a new level.
    const loadUpload = async (level : LevelSummary) => {
        LevelSelection.selectedLevelPath = level.path;
        LevelSelection.selectedLevelId = level.id;
        EditingLevel.id = level.id;
        EditingLevel.name = level.name;
        EditingLevel.tags = level.tags;
        EditingLevel.description = level.description;
        await NVScene.LoadLevelFromPath(level.path);
        onClose();
    };

    return <div className="nv-backdrop fixed inset-0 z-40 flex items-center justify-center">
        <div className="nv-panel flex flex-col gap-4 px-8 py-6 w-full max-w-2xl max-h-[80vh]">
            <div>
                <div className="nv-label">Editor</div>
                <div className="nv-title text-4xl">Start From</div>
            </div>

            <div className="flex">
                {TABS.map(({tab: t, label}) => (
                    <button
                        key={t}
                        className={`nv-tab ${tab === t ? "nv-tab-active" : ""}`}
                        onClick={() => setTab(t)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="nv-scroll overflow-y-auto">
                {tab === 'presets' && (
                    presets === null ? <div className="text-sm text-ash py-6 text-center">Loading…</div> :
                    <div className="grid grid-cols-4 gap-3">
                        {/* Not a real preset (see BlankLevel.json/MainMenu.openEditor, which
                        already loaded it) - just needs to close the modal. Always first, even
                        with no presets configured yet. */}
                        <LevelTile name="Blank" thumbnailSrc="/blank-level-thumbnail.svg" onClick={onClose} />
                        {presets.map(preset => (
                            <LevelTile
                                key={preset.file}
                                name={preset.name}
                                thumbnailSrc={preset.thumbnail ? `/level-presets/${preset.thumbnail}` : undefined}
                                onClick={() => loadPreset(preset)}
                            />
                        ))}
                    </div>
                )}

                {tab === 'saves' && (
                    saves.length === 0 ? <div className="text-sm text-ash py-6 text-center">Nothing saved yet.</div> :
                    <div className="grid grid-cols-4 gap-3">
                        {saves.map(save => (
                            <LevelTile key={save.name} name={save.name} thumbnailSrc={save.thumbnailDataUrl} onClick={() => loadSave(save)} />
                        ))}
                    </div>
                )}

                {tab === 'uploads' && (
                    uploadsError ? <div className="text-sm text-blood py-6 text-center">{uploadsError}</div> :
                    uploads === null ? <div className="text-sm text-ash py-6 text-center">Loading…</div> :
                    uploads.length === 0 ? <div className="text-sm text-ash py-6 text-center">You haven't uploaded any levels yet.</div> :
                    <div className="grid grid-cols-4 gap-3">
                        {uploads.map(level => (
                            <LevelTile key={level.id} name={level.name} thumbnailSrc={level.thumbnailUrl} onClick={() => loadUpload(level)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>;
};
