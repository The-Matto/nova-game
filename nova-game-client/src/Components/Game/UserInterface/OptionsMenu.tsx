import {useState} from "react";
import {PlayerSettings, SavePlayerSettings} from "../../../Three/Utility/PlayerGlobals";

//Mouse sensitivity sliders - mutates PlayerSettings directly (read live by ReactInputHandler on
//every mousemove), so a drag takes effect immediately with no extra wiring.
const SensitivitySlider = ({label, value, onChange} : {
    label : string,
    value : number,
    onChange : (value : number) => void,
}) => (
    <label className="flex flex-col gap-1 text-orange-500">
        <span>{label}: {value.toFixed(1)}</span>
        <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="accent-orange-500 cursor-pointer"
        />
    </label>
);

export const OptionsMenu = ({onBack} : { onBack : () => void }) => {

    const [sensitivityX, setSensitivityX] = useState(PlayerSettings.mouseSensitivityX);
    const [sensitivityY, setSensitivityY] = useState(PlayerSettings.mouseSensitivityY);

    return <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/25">
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-12 py-10">
            <div className="text-4xl font-bold text-orange-500">Options</div>
            <div className="flex flex-col gap-4 w-64">
                <SensitivitySlider
                    label="Mouse Sensitivity X"
                    value={sensitivityX}
                    onChange={v => { PlayerSettings.mouseSensitivityX = v; setSensitivityX(v); SavePlayerSettings(); }}
                />
                <SensitivitySlider
                    label="Mouse Sensitivity Y"
                    value={sensitivityY}
                    onChange={v => { PlayerSettings.mouseSensitivityY = v; setSensitivityY(v); SavePlayerSettings(); }}
                />
            </div>
            <button
                className="mt-4 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={onBack}
            >
                Back
            </button>
        </div>
    </div>;
};
