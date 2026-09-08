import {useState} from "react";
import {NVScene} from "../../../Three/NVScene";
import {Game} from "../../../Three/Game";
import {EditingLevel} from "../../../Three/Utility/PlayerGlobals";
import {DragNumberInput} from "../../UI/DragNumberInput";
import {EditorLevelStorageModal} from "./EditorLevelStorageModal";
import {EditorUploadModal} from "./EditorUploadModal";
import {EditorUploadChoiceModal} from "./EditorUploadChoiceModal";
import {EditorUpdateModal} from "./EditorUpdateModal";

//Sits at the far left (see EditorMenu) - level-wide settings (as opposed to any one actor's, see
//EditorInspectorPanel) plus save/load (browser storage, see EditorLevelStorageModal) and upload,
//moved here from the spawn-actor menu so that one's just actors.
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

    const openUploadFlow = () => {
        setUploadThumbnail(Game.GetInstance().renderer.renderer.domElement.toDataURL('image/jpeg', 0.85));
        setUploadMode(EditingLevel.id !== null ? 'choice' : 'new');
    };

    const closeUploadFlow = () => {
        setUploadThumbnail(null);
        setUploadMode(null);
    };

    //Applies straight to the live scene, same "mutate the live instance directly" pattern as
    //EditorInspectorPanel - the local state above is only for these controls to be controlled
    //inputs, not the source of truth.
    const applySettings = (next : Partial<typeof NVScene.worldSettings>) => {
        NVScene.ApplyWorldSettings({...NVScene.worldSettings, ...next});
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
        <div className="text-x2 font-bold mb-3">World Settings</div>

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
