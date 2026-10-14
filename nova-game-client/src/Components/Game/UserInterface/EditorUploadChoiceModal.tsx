import {EditingLevel} from "../../../Three/Utility/PlayerGlobals";

//Shown when Upload is clicked while editing an existing level (see EditorWorldSettingsPanel) -
//lets the player choose to overwrite it in place, or branch off a separate new level instead.
export const EditorUploadChoiceModal = ({onChooseUpdate, onChooseNew, onClose} : {
    onChooseUpdate : () => void,
    onChooseNew : () => void,
    onClose : () => void,
}) => {
    return <div className="nv-backdrop fixed inset-0 z-40 flex items-center justify-center">
        <div className="nv-panel flex flex-col gap-3 px-8 py-6 w-full max-w-sm">
            <div className="nv-title text-4xl mb-1">Upload</div>

            <button
                className="group bg-acid hover:bg-bone px-4 py-3 text-left cursor-pointer"
                onClick={onChooseUpdate}
            >
                <div className="text-sm font-bold uppercase tracking-wide text-ink-950 truncate">Update "{EditingLevel.name}"</div>
                <div className="text-xs text-ink-950/70">Overwrite the existing level with your changes.</div>
            </button>
            <button
                className="nv-row px-4 py-3 text-left"
                onClick={onChooseNew}
            >
                <div className="text-sm font-bold uppercase tracking-wide text-bone">Upload as New Level</div>
                <div className="text-xs text-ash">Create a separate level - the original is untouched.</div>
            </button>

            <button
                className="nv-btn nv-btn-ghost self-start"
                onClick={onClose}
            >
                Cancel
            </button>
        </div>
    </div>;
};
