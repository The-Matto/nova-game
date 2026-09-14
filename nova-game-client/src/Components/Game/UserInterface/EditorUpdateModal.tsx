import {useState} from "react";
import {NVScene} from "../../../Three/NVScene";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";
import {EditingLevel, EditorState} from "../../../Three/Utility/PlayerGlobals";

//Overwrites EditingLevel.id in place - name/tags/description carry over unchanged (see
//LevelBrowser.tsx's "Edit Level"), only the level data and thumbnail are actually fresh.
export const EditorUpdateModal = ({thumbnailDataUrl, onClose} : {thumbnailDataUrl : string, onClose : () => void}) => {
    const [status, setStatus] = useState<'idle' | 'updating' | 'error'>('idle');

    const update = async () => {
        if (status === 'updating' || !EditingLevel.id) return;
        setStatus('updating');
        try {
            const playerId = await EnsureRegistered();
            const res = await fetch('/api/levels', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    playerId,
                    levelId: EditingLevel.id,
                    name: EditingLevel.name,
                    levelData: NVScene.SerializeLevel(),
                    thumbnailDataUrl,
                    tags: EditingLevel.tags,
                    description: EditingLevel.description ?? "",
                }),
            });
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            EditorState.isDirty = false;
            onClose();
        } catch {
            setStatus('error');
        }
    };

    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50">
        <div className="flex flex-col gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-8 py-6 w-full max-w-sm">
            <div className="text-lg font-bold text-orange-500">Update Level</div>

            <img src={thumbnailDataUrl} alt="" className="w-full aspect-video object-cover rounded-lg bg-slate-800" />

            <div className="text-sm text-white/70">
                This overwrites <span className="text-orange-100 font-semibold">{EditingLevel.name}</span> with your
                current changes - name, tags, and description stay the same.
            </div>
            {status === 'error' && <div className="text-sm text-red-400">Update failed - try again.</div>}

            <div className="flex gap-2">
                <button
                    className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm text-orange-500/70 cursor-pointer"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 rounded-lg px-4 py-2 text-sm text-orange-100 cursor-pointer disabled:opacity-50"
                    onClick={update}
                    disabled={status === 'updating'}
                >
                    {status === 'updating' ? "Updating…" : "Update Level"}
                </button>
            </div>
        </div>
    </div>;
};
