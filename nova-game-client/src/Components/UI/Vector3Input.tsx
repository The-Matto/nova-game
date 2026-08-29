import {DragNumberInput} from "./DragNumberInput";

export type Axis = 'x' | 'y' | 'z';

//Standard 3D-editor axis colors.
const AXIS_COLORS : Record<Axis, string> = {
    x: 'text-red-500',
    y: 'text-green-500',
    z: 'text-blue-500',
};

//Three DragNumberInputs in a row, one per axis, each preceded by its (color-coded) letter.
export const Vector3Input = ({vector, onChange, sensitivity, className} : {
    vector : { x : number, y : number, z : number },
    onChange : (axis : Axis, value : number) => void,
    sensitivity? : number,
    className? : string,
}) => (
    <div className="flex flex-1 min-w-0 gap-1">
        {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis} className="flex items-center gap-0.5 flex-1 min-w-0">
                <span className={`text-xs font-bold ${AXIS_COLORS[axis]}`}>{axis.toUpperCase()}</span>
                <DragNumberInput
                    value={vector[axis]}
                    onChange={v => onChange(axis, v)}
                    sensitivity={sensitivity}
                    className={className}
                />
            </div>
        ))}
    </div>
);
