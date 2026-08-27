import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {EditorState} from "../../../Three/Utility/PlayerGlobals";
import type {NVActor} from "../../../Three/Actor";

const isHexColor = (value : unknown) : value is string =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

//Shown while in editor mode with an actor selected - one input per @EditableProperty field,
//writing straight back to the live actor instance on change.
export const EditorInspectorPanel = () => {

    const [isVisible, setIsVisible] = useState(EditorState.isInEditor);
    const [selectedActor, setSelectedActor] = useState<NVActor | null>(null);
    //Bumped to force a re-render, since edits mutate the actor directly rather than going through
    //React state.
    const [, forceRerender] = useState(0);

    useEffect(() => {
        const offMode = GameEvents.On('editorModeChanged', ({isInEditor}) => setIsVisible(isInEditor));
        const offSelection = GameEvents.On('actorSelectionChanged', ({actor}) => setSelectedActor(actor));
        return () => {
            offMode();
            offSelection();
        };
    }, []);

    if (!isVisible || !selectedActor) return null;

    const properties = selectedActor.GetEditableProperties();
    if (properties.length === 0) return null;

    const setValue = (key : string, value : unknown) => {
        (selectedActor as unknown as Record<string, unknown>)[key] = value;
        selectedActor.OnEditablePropertyChanged(key);
        forceRerender(n => n + 1);
    };

    return <div className="absolute top-4 right-4 z-30 w-56 bg-slate-900 rounded-xl p-4 text-orange-500">
        <div className="text-xl font-bold mb-3">{selectedActor.constructor.name}</div>

        <div className="flex flex-col gap-3">
            {properties.map(({key, value}) => (
                <label key={key} className="flex flex-col gap-1 text-sm capitalize">
                    {key}
                    {typeof value === 'boolean' ? (
                        <input
                            type="checkbox"
                            checked={value}
                            onChange={e => setValue(key, e.target.checked)}
                            className="self-start"
                        />
                    ) : typeof value === 'number' ? (
                        <input
                            type="number"
                            value={value}
                            onChange={e => setValue(key, Number(e.target.value))}
                            className="bg-slate-800 rounded-lg px-2 py-1 text-orange-100 outline-none"
                        />
                    ) : isHexColor(value) ? (
                        <input
                            type="color"
                            value={value}
                            onChange={e => setValue(key, e.target.value)}
                            className="h-8 w-full bg-slate-800 rounded-lg outline-none cursor-pointer"
                        />
                    ) : (
                        <input
                            type="text"
                            value={String(value)}
                            onChange={e => setValue(key, e.target.value)}
                            className="bg-slate-800 rounded-lg px-2 py-1 text-orange-100 outline-none"
                        />
                    )}
                </label>
            ))}
        </div>
    </div>;
};
