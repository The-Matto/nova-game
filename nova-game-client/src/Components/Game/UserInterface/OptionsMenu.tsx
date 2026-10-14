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
    <label className="flex flex-col gap-1">
        <span className="flex justify-between items-baseline">
            <span className="text-sm font-semibold uppercase tracking-wider text-bone">{label}</span>
            <span className="font-mono text-sm text-molten">{value.toFixed(1)}{suffix}</span>
        </span>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="nv-range w-full"
        />
    </label>
);

export const OptionsMenu = ({onBack} : { onBack : () => void }) => {

    const [sensitivityX, setSensitivityX] = useState(PlayerSettings.mouseSensitivityX);
    const [sensitivityY, setSensitivityY] = useState(PlayerSettings.mouseSensitivityY);
    const [cameraTilt, setCameraTilt] = useState(PlayerSettings.cameraTiltDegrees);
    const [soundVolume, setSoundVolume] = useState(PlayerSettings.soundVolume);

    return <div className="nv-backdrop absolute inset-0 z-30 flex items-center justify-center">
        <div className="nv-panel flex flex-col gap-6 px-10 py-9 w-96">
            <div>
                <div className="nv-label">Settings</div>
                <div className="nv-title text-5xl">Options</div>
            </div>
            <div className="flex flex-col gap-5">
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
            <button className="nv-btn nv-btn-lg self-start mt-2" onClick={onBack}>
                ← Back
            </button>
        </div>
    </div>;
};
