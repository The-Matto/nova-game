import {useEffect, useState} from "react";
import {NVScene, MAX_LEVEL_ACTORS} from "../../../Three/NVScene";
import {Game} from "../../../Three/Game";
import {EditingLevel, EditorState, MarkLevelDirty, PlayerStatics} from "../../../Three/Utility/PlayerGlobals";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {DragNumberInput} from "../../UI/DragNumberInput";
import {EditorLevelStorageModal} from "./EditorLevelStorageModal";
import {SaveLevel} from "../../../Three/Editor/EditorLevelStorage";
import {EditorUploadModal} from "./EditorUploadModal";
import {EditorUploadChoiceModal} from "./EditorUploadChoiceModal";
import {EditorUpdateModal} from "./EditorUpdateModal";
import {OptionsMenu} from "./OptionsMenu";

//Fills up as the level's actor count approaches NVScene.MAX_LEVEL_ACTORS - see
//EditorSpawning/EditorSelection, which stop letting you place more once it's full.
const ActorLimitBar = () => {
    const [count, setCount] = useState(NVScene.GetLevelActorCount());

    useEffect(() => {
        return GameEvents.On('levelActorCountChanged', payload => setCount(payload.count));
    }, []);

    const fraction = Math.min(count / MAX_LEVEL_ACTORS, 1);
    const isFull = count >= MAX_LEVEL_ACTORS;

    return <div className="mb-3">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-orange-500/60 mb-1">
            <span>Actors</span>
            <span>{count}/{MAX_LEVEL_ACTORS}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
                className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-orange-500'}`}
                style={{width: `${fraction * 100}%`}}
            />
        </div>
    </div>;
};

//Shown from EditorMenuOverlay's "Return to Menu" - a full reload discards any in-memory editor
//state, so this offers a quick named local save first instead of silently losing it.
const LeaveConfirmModal = ({onCancel} : {onCancel : () => void}) => {
    const [saveName, setSaveName] = useState("");
    const [saveError, setSaveError] = useState<string | null>(null);

    const saveAndLeave = () => {
        const name = saveName.trim();
        if (!name) return;

        const thumbnailDataUrl = Game.GetInstance().renderer.renderer.domElement.toDataURL('image/jpeg', 0.85);
        if (!SaveLevel(name, NVScene.SerializeLevel(), thumbnailDataUrl)) {
            setSaveError("Couldn't save - browser storage may be full.");
            return;
        }
        window.location.reload();
    };

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50">
        <div className="flex flex-col gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-8 py-6 w-full max-w-sm">
            <div className="text-lg font-bold text-orange-500">Leave Editor?</div>
            <div className="text-sm text-white/70">Any unsaved changes to this level will be lost.</div>

            <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveAndLeave(); }}
                placeholder="Level name to save as..."
                autoFocus
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none text-sm"
            />
            {saveError && <div className="text-sm text-red-400">{saveError}</div>}
            <button
                className="bg-emerald-700 hover:bg-emerald-600 rounded-lg px-3 py-2 text-sm text-orange-100 cursor-pointer disabled:opacity-50"
                onClick={saveAndLeave}
                disabled={!saveName.trim()}
            >
                Save & Return to Menu
            </button>

            <div className="flex gap-2">
                <button
                    className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-sm text-orange-500/70 cursor-pointer"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-sm text-red-400/80 hover:text-red-400 cursor-pointer"
                    onClick={() => window.location.reload()}
                >
                    Leave Without Saving
                </button>
            </div>
        </div>
    </div>;
};

//'P' is taken while editing - it starts Play mode instead of pausing (no gameplay to pause yet).
//This is the only other way to reach Options/leave the editor.
const EditorMenuOverlay = ({onClose} : {onClose : () => void}) => {
    const [showOptions, setShowOptions] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    if (showOptions) return <OptionsMenu onBack={() => setShowOptions(false)} />;
    if (showLeaveConfirm) return <LeaveConfirmModal onCancel={() => setShowLeaveConfirm(false)} />;

    //Nothing to lose if the level hasn't actually been touched since it was loaded/saved/
    //uploaded - skip the prompt and leave straight away instead of nagging every time.
    const handleReturnToMenu = () => {
        if (EditorState.isDirty) setShowLeaveConfirm(true);
        else window.location.reload();
    };

    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/25">
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-12 py-10">
            <div className="text-4xl font-bold text-orange-500">Menu</div>
            <button
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={onClose}
            >
                Resume Editing
            </button>
            <button
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={() => setShowOptions(true)}
            >
                Options
            </button>
            <button
                className="mt-4 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-lg text-orange-500/70 cursor-pointer"
                onClick={handleReturnToMenu}
            >
                Return to Menu
            </button>
        </div>
    </div>;
};

//Sits at the far left (see EditorMenu) - level-wide settings, Play/Menu, the actor count limit,
//plus save/load and upload.
export const EditorWorldSettingsPanel = () => {

    const [skyColor, setSkyColor] = useState(NVScene.worldSettings.skyColor);
    const [killY, setKillY] = useState(NVScene.worldSettings.killY);
    const [fogDistance, setFogDistance] = useState(NVScene.worldSettings.fogDistance);
    const [lavaRiseSpeed, setLavaRiseSpeed] = useState(NVScene.worldSettings.lavaRiseSpeed);

    const [showStorageModal, setShowStorageModal] = useState(false);
    //Set (not just a boolean) so the captured thumbnail is available to render as soon as the
    //modal opens - captured once here, at open time, not re-captured at submit time.
    const [uploadThumbnail, setUploadThumbnail] = useState<string | null>(null);
    //'choice' only appears when editing an existing level (see EditingLevel) - a fresh level
    //skips straight to 'new', since there's nothing to update yet.
    const [uploadMode, setUploadMode] = useState<'choice' | 'update' | 'new' | null>(null);
    //Set by openUploadFlow when the level's missing a Player Start/Goal - covers both the "new"
    //and "update" paths, since both only ever start there.
    const [uploadValidationError, setUploadValidationError] = useState<string | null>(null);

    const [showMenu, setShowMenu] = useState(false);

    //Escape already pauses during gameplay (Canvas.tsx's pointerlockchange handler) - this covers
    //purely editing, with no pointer lock to lose. Ignored while typing.
    useEffect(() => {
        const onKeyDown = (e : KeyboardEvent) => {
            if (e.code !== 'Escape') return;
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            setShowMenu(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const openUploadFlow = () => {
        const missing = NVScene.GetMissingRequiredActorLabels();
        if (missing.length > 0) {
            setUploadValidationError(`Add ${missing.join(' and ')} before uploading.`);
            return;
        }

        setUploadValidationError(null);
        setUploadThumbnail(Game.GetInstance().renderer.renderer.domElement.toDataURL('image/jpeg', 0.85));
        setUploadMode(EditingLevel.id !== null ? 'choice' : 'new');
    };

    const closeUploadFlow = () => {
        setUploadThumbnail(null);
        setUploadMode(null);
    };

    //Applies straight to the live scene, same "mutate directly" pattern as EditorInspectorPanel -
    //local state above is just for controlled inputs, not the source of truth.
    const applySettings = (next : Partial<typeof NVScene.worldSettings>) => {
        NVScene.ApplyWorldSettings({...NVScene.worldSettings, ...next});
        MarkLevelDirty();
    };

    //After loading a saved/imported level, the panel's own controls need to catch up to whatever
    //world settings came with it.
    const onLevelLoaded = () => {
        setSkyColor(NVScene.worldSettings.skyColor);
        setKillY(NVScene.worldSettings.killY);
        setFogDistance(NVScene.worldSettings.fogDistance);
        setLavaRiseSpeed(NVScene.worldSettings.lavaRiseSpeed);
        setShowStorageModal(false);
    };

    return <div className="pointer-events-auto w-40 max-h-[85vh] overflow-y-auto bg-slate-900 rounded-xl p-4 text-orange-500">
        {showMenu && <EditorMenuOverlay onClose={() => setShowMenu(false)} />}

        <div className="text-x2 font-bold mb-3">World Settings</div>

        <div className="flex gap-1.5 mb-3">
            <button
                className="flex-1 bg-emerald-700 hover:bg-emerald-600 rounded-lg px-1.5 py-1 text-xs font-bold cursor-pointer"
                onClick={() => PlayerStatics.PlayerController?.EnterPlayMode()}
            >
                ▶ Play
            </button>
            <button
                className="bg-slate-800 hover:bg-slate-700 rounded-lg px-2 py-1 text-xs cursor-pointer"
                onClick={() => setShowMenu(true)}
            >
                ☰
            </button>
        </div>

        <ActorLimitBar />

        <div className="flex flex-col gap-2 mb-3">
            <label className="flex items-center justify-between text-xs">
                <span>Sky Color</span>
                <input
                    type="color"
                    value={skyColor}
                    onChange={e => { setSkyColor(e.target.value); applySettings({skyColor: e.target.value}); }}
                    className="w-16 h-5 bg-slate-800 rounded-lg outline-none cursor-pointer"
                />
            </label>
            <label className="flex items-center justify-between text-xs">
                <span>Kill Height</span>
                <DragNumberInput
                    value={killY}
                    onChange={v => { setKillY(v); applySettings({killY: v}); }}
                    className="w-16 bg-slate-800 rounded-lg px-1 py-px text-orange-100 outline-none"
                />
            </label>
            <label className="flex items-center justify-between text-xs">
                <span>Fog Distance</span>
                <DragNumberInput
                    value={fogDistance}
                    onChange={v => { setFogDistance(v); applySettings({fogDistance: v}); }}
                    min={1}
                    max={100}
                    sensitivity={1}
                    className="w-16 bg-slate-800 rounded-lg px-1 py-px text-orange-100 outline-none"
                />
            </label>
            <label className="flex items-center justify-between text-xs">
                <span>Lava Rise Speed</span>
                <DragNumberInput
                    value={lavaRiseSpeed}
                    onChange={v => { setLavaRiseSpeed(v); applySettings({lavaRiseSpeed: v}); }}
                    min={0}
                    max={5}
                    sensitivity={0.05}
                    className="w-16 bg-slate-800 rounded-lg px-1 py-px text-orange-100 outline-none"
                />
            </label>
        </div>

        <div className="flex flex-col gap-2 mb-3">
            <button
                className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg px-1.5 py-1 text-xs cursor-pointer"
                onClick={() => setShowStorageModal(true)}
            >
                Save / Load
            </button>
            <button
                className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg px-1.5 py-1 text-xs cursor-pointer"
                onClick={openUploadFlow}
            >
                Upload
            </button>
            {uploadValidationError && <div className="text-[10px] text-red-400">{uploadValidationError}</div>}
        </div>

        {showStorageModal && (
            <EditorLevelStorageModal onClose={onLevelLoaded} />
        )}

        {uploadThumbnail && uploadMode === 'choice' && (
            <EditorUploadChoiceModal
                onChooseUpdate={() => setUploadMode('update')}
                onChooseNew={() => setUploadMode('new')}
                onClose={closeUploadFlow}
            />
        )}
        {uploadThumbnail && uploadMode === 'update' && (
            <EditorUpdateModal thumbnailDataUrl={uploadThumbnail} onClose={closeUploadFlow} />
        )}
        {uploadThumbnail && uploadMode === 'new' && (
            <EditorUploadModal thumbnailDataUrl={uploadThumbnail} onClose={closeUploadFlow} />
        )}
    </div>;
};
