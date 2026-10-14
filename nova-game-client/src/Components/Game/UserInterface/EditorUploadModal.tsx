import {useState} from "react";
import {NVScene} from "../../../Three/NVScene";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";
import {EditorState} from "../../../Three/Utility/PlayerGlobals";
import {LEVEL_TAGS} from "nova-shared/level-tags";
import type {LevelTag} from "nova-shared/level-tags";

//thumbnailDataUrl is captured once, right as the modal opens (see EditorWorldSettingsPanel) -
//shown here so what you see is genuinely what gets uploaded, not a promise of a fresh capture
//at submit time.
export const EditorUploadModal = ({thumbnailDataUrl, onClose} : {thumbnailDataUrl : string, onClose : () => void}) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<LevelTag[]>([]);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');

    const toggleTag = (tag : LevelTag) => {
        setTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
    };

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
                    tags,
                    description: description.trim(),
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
        <div className="flex flex-col gap-4 nv-panel px-8 py-6 w-full max-w-md">
            <div className="nv-title text-4xl">Upload Level</div>

            <img src={thumbnailDataUrl} alt="" className="nv-thumb w-full aspect-video" />

            <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") upload(); }}
                placeholder="Level name..."
                autoFocus
                className="w-full nv-input text-sm"
            />

            <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your level... (optional)"
                maxLength={500}
                rows={3}
                className="w-full nv-input text-sm resize-none"
            />

            <div className="flex flex-wrap gap-1.5">
                {LEVEL_TAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`nv-chip ${tags.includes(tag) ? "nv-chip-active" : ""}`}
                    >
                        {tag}
                    </button>
                ))}
            </div>
            {status === 'error' && <div className="text-sm text-blood">Upload failed - try again.</div>}

            <div className="flex gap-2">
                <button
                    className="nv-btn nv-btn-ghost"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    className="nv-btn nv-btn-go flex-1"
                    onClick={upload}
                    disabled={status === 'uploading' || !name.trim()}
                >
                    {status === 'uploading' ? "Uploading…" : "Upload to Nova"}
                </button>
            </div>
        </div>
    </div>;
};
