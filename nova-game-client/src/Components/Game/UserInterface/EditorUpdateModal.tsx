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

    return <div className="nv-backdrop fixed inset-0 z-40 flex items-center justify-center">
        <div className="flex flex-col gap-4 nv-panel px-8 py-6 w-full max-w-sm">
            <div className="nv-title text-4xl">Update Level</div>

            <img src={thumbnailDataUrl} alt="" className="nv-thumb w-full aspect-video" />

            <div className="text-sm text-bone/80">
                This overwrites <span className="text-molten font-semibold">{EditingLevel.name}</span> with your
                current changes - name, tags, and description stay the same.
            </div>
            {status === 'error' && <div className="text-sm text-blood">Update failed - try again.</div>}

            <div className="flex gap-2">
                <button
                    className="nv-btn nv-btn-ghost"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    className="nv-btn nv-btn-go flex-1"
                    onClick={update}
                    disabled={status === 'updating'}
                >
                    {status === 'updating' ? "Updating…" : "Update Level"}
                </button>
            </div>
        </div>
    </div>;
};
