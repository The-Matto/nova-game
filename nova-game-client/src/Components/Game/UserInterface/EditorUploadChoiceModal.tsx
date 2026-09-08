import {EditingLevel} from "../../../Three/Utility/PlayerGlobals";

//Shown when Upload is clicked while editing an existing level (see EditorWorldSettingsPanel) -
//lets the player choose to overwrite it in place, or branch off a separate new level instead.
export const EditorUploadChoiceModal = ({onChooseUpdate, onChooseNew, onClose} : {
    onChooseUpdate : () => void,
    onChooseNew : () => void,
    onClose : () => void,
}) => {
    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50">
        <div className="flex flex-col gap-3 border border-orange-500/40 rounded-2xl bg-slate-900 px-8 py-6 w-full max-w-sm">
            <div className="text-lg font-bold text-orange-500">Upload</div>

            <button
                className="bg-emerald-700 hover:bg-emerald-600 rounded-lg px-4 py-3 text-left cursor-pointer"
                onClick={onChooseUpdate}
            >
                <div className="text-sm font-semibold text-orange-100 truncate">Update "{EditingLevel.name}"</div>
                <div className="text-xs text-orange-100/70">Overwrite the existing level with your changes.</div>
            </button>
            <button
                className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 text-left cursor-pointer"
                onClick={onChooseNew}
            >
                <div className="text-sm font-semibold text-orange-500">Upload as New Level</div>
                <div className="text-xs text-orange-500/70">Create a separate level - the original is untouched.</div>
            </button>

            <button
                className="self-start bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm text-orange-500/70 cursor-pointer"
                onClick={onClose}
            >
                Cancel
            </button>
        </div>
    </div>;
};
