import {useState} from "react";
import {NVScene} from "../../../Three/NVScene";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";

//thumbnailDataUrl is captured once, right as the modal opens (see EditorWorldSettingsPanel) -
//shown here so what you see is genuinely what gets uploaded, not a promise of a fresh capture
//at submit time.
export const EditorUploadModal = ({thumbnailDataUrl, onClose} : {thumbnailDataUrl : string, onClose : () => void}) => {
    const [name, setName] = useState("");
    const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');

    const upload = async () => {
        if (!name.trim() || status === 'uploading') return;
        setStatus('uploading');
        try {
            const playerId = await EnsureRegistered();
            const res = await fetch('/api/levels', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    playerId,
                    name: name.trim(),
                    levelData: NVScene.SerializeLevel(),
                    thumbnailDataUrl,
                }),
            });
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            onClose();
        } catch {
            setStatus('error');
        }
    };

    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50">
        <div className="flex flex-col gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-8 py-6 w-full max-w-sm">
            <div className="text-lg font-bold text-orange-500">Upload Level</div>

            <img src={thumbnailDataUrl} alt="" className="w-full aspect-video object-cover rounded-lg bg-slate-800" />

            <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") upload(); }}
                placeholder="Level name..."
                autoFocus
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none text-sm"
            />
            {status === 'error' && <div className="text-sm text-red-400">Upload failed - try again.</div>}

            <div className="flex gap-2">
                <button
                    className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm text-orange-500/70 cursor-pointer"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 rounded-lg px-4 py-2 text-sm text-orange-100 cursor-pointer disabled:opacity-50"
                    onClick={upload}
                    disabled={status === 'uploading' || !name.trim()}
                >
                    {status === 'uploading' ? "Uploading…" : "Upload to Nova"}
                </button>
            </div>
        </div>
    </div>;
};
