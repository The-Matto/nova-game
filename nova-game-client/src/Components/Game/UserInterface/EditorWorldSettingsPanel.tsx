import {useState} from "react";
import {NVScene} from "../../../Three/NVScene";
import {Game} from "../../../Three/Game";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";
import {DragNumberInput} from "../../UI/DragNumberInput";
import {EditorLevelStorageModal} from "./EditorLevelStorageModal";

//Sits at the far left (see EditorMenu) - level-wide settings (as opposed to any one actor's, see
//EditorInspectorPanel) plus save/load (browser storage, see EditorLevelStorageModal) and upload,
//moved here from the spawn-actor menu so that one's just actors.
export const EditorWorldSettingsPanel = () => {

    const [skyColor, setSkyColor] = useState(NVScene.worldSettings.skyColor);
    const [killY, setKillY] = useState(NVScene.worldSettings.killY);
    const [fogDistance, setFogDistance] = useState(NVScene.worldSettings.fogDistance);

    const [showStorageModal, setShowStorageModal] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadName, setUploadName] = useState("");
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle');

    //Applies straight to the live scene, same "mutate the live instance directly" pattern as
    //EditorInspectorPanel - the local state above is only for these controls to be controlled
    //inputs, not the source of truth.
    const applySettings = (next : Partial<typeof NVScene.worldSettings>) => {
        NVScene.ApplyWorldSettings({...NVScene.worldSettings, ...next});
    };

    //Sends the current level (plus a screenshot of the editor view as its thumbnail) to the
    //backend - see LevelsApi.ts's POST /api/levels.
    const uploadLevel = async () => {
        if (!uploadName.trim()) return;
        setUploadStatus('uploading');
        try {
            const playerId = await EnsureRegistered();
            const thumbnailDataUrl = Game.GetInstance().renderer.renderer.domElement.toDataURL('image/jpeg', 0.85);
            const res = await fetch('/api/levels', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    playerId,
                    name: uploadName.trim(),
                    levelData: NVScene.SerializeLevel(),
                    thumbnailDataUrl,
                }),
            });
            if (!res.ok) throw new Error(`Server responded ${res.status}`);

            setUploadStatus('idle');
            setShowUpload(false);
            setUploadName("");
        } catch {
            setUploadStatus('error');
        }
    };

    //After loading a saved/imported level, the panel's own controls need to catch up to whatever
    //world settings came with it.
    const onLevelLoaded = () => {
        setSkyColor(NVScene.worldSettings.skyColor);
        setKillY(NVScene.worldSettings.killY);
        setFogDistance(NVScene.worldSettings.fogDistance);
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
                    min={0}
                    sensitivity={1}
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
                onClick={() => {
                    setShowUpload(v => !v);
                    setUploadStatus('idle');
                }}
            >
                Upload
            </button>
        </div>

        {showUpload && (
            <div className="mb-3 flex flex-col gap-2">
                <input
                    type="text"
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    placeholder="Level name..."
                    className="w-full bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none text-sm"
                />
                {uploadStatus === 'error' && <div className="text-sm text-red-400">Upload failed - try again.</div>}
                <button
                    className="bg-slate-800 hover:bg-slate-700 rounded-lg px-1.5 py-1 text-xs cursor-pointer disabled:opacity-50"
                    onClick={uploadLevel}
                    disabled={uploadStatus === 'uploading' || !uploadName.trim()}
                >
                    {uploadStatus === 'uploading' ? "Uploading…" : "Upload to Nova"}
                </button>
            </div>
        )}

        {showStorageModal && (
            <EditorLevelStorageModal onClose={onLevelLoaded} />
        )}
    </div>;
};
