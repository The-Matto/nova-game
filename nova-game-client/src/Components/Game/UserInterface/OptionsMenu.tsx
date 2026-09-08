import {useState} from "react";
import {PlayerSettings, SavePlayerSettings} from "../../../Three/Utility/PlayerGlobals";

//A generic labeled slider - mutates a PlayerSettings field directly (read live wherever that
//setting's used, e.g. every mousemove or every NVWeapon.Tick), so a drag takes effect
//immediately with no extra wiring.
const SettingSlider = ({label, value, onChange, min = 1, max = 15, step = 0.5, suffix = ""} : {
    label : string,
    value : number,
    onChange : (value : number) => void,
    min? : number,
    max? : number,
    step? : number,
    suffix? : string,
}) => (
    <label className="flex flex-col gap-1 text-orange-500">
        <span>{label}: {value.toFixed(1)}{suffix}</span>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="accent-orange-500 cursor-pointer"
        />
    </label>
);

export const OptionsMenu = ({onBack} : { onBack : () => void }) => {

    const [sensitivityX, setSensitivityX] = useState(PlayerSettings.mouseSensitivityX);
    const [sensitivityY, setSensitivityY] = useState(PlayerSettings.mouseSensitivityY);
    const [cameraTilt, setCameraTilt] = useState(PlayerSettings.cameraTiltDegrees);
    const [soundVolume, setSoundVolume] = useState(PlayerSettings.soundVolume);

    return <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/25">
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-12 py-10">
            <div className="text-4xl font-bold text-orange-500">Options</div>
            <div className="flex flex-col gap-4 w-64">
                <SettingSlider
                    label="Mouse Sensitivity X"
                    value={sensitivityX}
                    onChange={v => { PlayerSettings.mouseSensitivityX = v; setSensitivityX(v); SavePlayerSettings(); }}
                />
                <SettingSlider
                    label="Mouse Sensitivity Y"
                    value={sensitivityY}
                    onChange={v => { PlayerSettings.mouseSensitivityY = v; setSensitivityY(v); SavePlayerSettings(); }}
                />
                <SettingSlider
                    label="Camera Tilt"
                    value={cameraTilt}
                    onChange={v => { PlayerSettings.cameraTiltDegrees = v; setCameraTilt(v); SavePlayerSettings(); }}
                    min={0}
                    max={10}
                    suffix="°"
                />
                <SettingSlider
                    label="Sound Volume"
                    value={soundVolume}
                    onChange={v => { PlayerSettings.soundVolume = v; setSoundVolume(v); SavePlayerSettings(); }}
                    min={0}
                    max={100}
                    step={5}
                    suffix="%"
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
