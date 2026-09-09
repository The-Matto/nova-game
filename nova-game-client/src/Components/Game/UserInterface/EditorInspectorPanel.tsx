import {useEffect, useState} from "react";
import * as THREE from "three";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {NVScene} from "../../../Three/NVScene";
import type {NVActor} from "../../../Three/Actor";
import {DragNumberInput} from "../../UI/DragNumberInput";
import {Vector3Input, type Axis} from "../../UI/Vector3Input";
import {GetActorDisplayName} from "../../../Three/Editor/EditorPalette";

const isHexColor = (value : unknown) : value is string =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const Vector3Row = ({label, vector, onChange, sensitivity} : {
    label : string,
    vector : { x : number, y : number, z : number },
    onChange : (axis : Axis, value : number) => void,
    sensitivity? : number,
}) => (
    <div className="flex items-center gap-1 text-xs">
        <span className="w-11 shrink-0">{label}</span>
        <Vector3Input
            vector={vector}
            onChange={onChange}
            sensitivity={sensitivity}
            className="flex-1 min-w-0 bg-slate-800 rounded-lg px-1 py-px text-orange-100 outline-none text-xs"
        />
    </div>
);

//Sits left of the spawn-actor menu (see EditorMenu) while an actor's selected - Location/
//Rotation/Scale plus one input per @EditableProperty field, writing straight back to the live
//actor instance on change.
export const EditorInspectorPanel = () => {

    const [selectedActor, setSelectedActor] = useState<NVActor | null>(null);
    //Bumped to force a re-render, since edits mutate the actor directly rather than going through
    //React state.
    const [, forceRerender] = useState(0);

    useEffect(() => {
        const offSelection = GameEvents.On('actorSelectionChanged', ({actor}) => setSelectedActor(actor));
        //Keeps Location/Rotation/Scale live while the gizmo is being dragged in the 3D view -
        //that mutates the actor directly, same as forceRerender's own doc comment above.
        const offTransform = GameEvents.On('actorTransformChanged', () => forceRerender(n => n + 1));
        return () => {
            offSelection();
            offTransform();
        };
    }, []);

    if (!selectedActor) return null;

    const setValue = (key : string, value : unknown) => {
        (selectedActor as unknown as Record<string, unknown>)[key] = value;
        selectedActor.OnEditablePropertyChanged(key);
        forceRerender(n => n + 1);
    };

    //Edits directly through `scene`, same as the gizmo - collision needs rebuilding after, for
    //the same reason a gizmo drag does (see NVScene.RebuildWorldOctree).
    const setTransform = (vector : THREE.Vector3 | THREE.Euler) => (axis : Axis, value : number) => {
        vector[axis] = vector instanceof THREE.Euler ? THREE.MathUtils.degToRad(value) : value;
        NVScene.RebuildWorldOctree();
        forceRerender(n => n + 1);
    };

    const properties = selectedActor.GetEditableProperties();
    const {position, rotation, scale} = selectedActor.scene;
    const rotationDegrees = new THREE.Vector3(
        THREE.MathUtils.radToDeg(rotation.x),
        THREE.MathUtils.radToDeg(rotation.y),
        THREE.MathUtils.radToDeg(rotation.z),
    );

    return <div className="pointer-events-auto w-56 max-h-[85vh] overflow-y-auto bg-slate-900 rounded-xl p-3 text-orange-500">
        <div className="text-base font-bold mb-1.5">{GetActorDisplayName(selectedActor.spawnDescriptor.class)}</div>

        <div className="flex flex-col gap-1.5 mb-2">
            <Vector3Row label="Location" vector={position} onChange={setTransform(position)} sensitivity={0.05} />
            <Vector3Row label="Rotation" vector={rotationDegrees} onChange={setTransform(rotation)} sensitivity={1} />
            <Vector3Row label="Scale" vector={scale} onChange={setTransform(scale)} sensitivity={0.02} />
        </div>

        {properties.length > 0 && (
            <div className="flex flex-col gap-1.5">
                {properties.map(({key, value, options}) => (
                    <label key={key} className="flex items-center gap-2 text-xs">
                        <span className="w-16 shrink-0 capitalize">{key}</span>
                        {options.choices ? (
                            <select
                                value={String(value)}
                                onChange={e => setValue(key, e.target.value)}
                                className="flex-1 min-w-0 bg-slate-800 rounded-lg px-1 py-px text-orange-100 outline-none cursor-pointer"
                            >
                                {options.choices.map(choice => (
                                    <option key={choice} value={choice}>{choice}</option>
                                ))}
                            </select>
                        ) : typeof value === 'boolean' ? (
                            <input
                                type="checkbox"
                                checked={value}
                                onChange={e => setValue(key, e.target.checked)}
                            />
                        ) : typeof value === 'number' ? (
                            <DragNumberInput
                                value={value}
                                onChange={v => setValue(key, v)}
                                min={options.min}
                                max={options.max}
                                isInteger={options.isInteger}
                                sensitivity={options.sensitivity}
                                className="flex-1 min-w-0 bg-slate-800 rounded-lg px-1 py-px text-orange-100 outline-none"
                            />
                        ) : isHexColor(value) ? (
                            <input
                                type="color"
                                value={value}
                                onChange={e => setValue(key, e.target.value)}
                                className="flex-1 h-5 bg-slate-800 rounded-lg outline-none cursor-pointer"
                            />
                        ) : (
                            <input
                                type="text"
                                value={String(value)}
                                onChange={e => setValue(key, e.target.value)}
                                className="flex-1 min-w-0 bg-slate-800 rounded-lg px-1 py-px text-orange-100 outline-none"
                            />
                        )}
                    </label>
                ))}
            </div>
        )}
    </div>;
};
