//Shared on/off-block state, Mario-Maker-style - shooting any NVSwitchButtonActor flips this, and
//every NVDisappearingCubeActor reacts. Lives outside either actor class since a level can have several.

export type SwitchColor = 'red' | 'blue';

class ColorSwitchStateClass {

    private active : SwitchColor = 'red';
    private listeners = new Set<(active : SwitchColor) => void>();

    public GetActive() : SwitchColor {
        return this.active;
    }

    public Toggle() : void {
        this.SetActive(this.active === 'red' ? 'blue' : 'red');
    }

    //Called on every level (re)load (NVScene.ResetLevelState) and player respawn
    //(NVSwitchButtonActor.OnPlayerRespawned), so a level always starts/retries deterministically.
    public Reset() : void {
        this.SetActive('red');
    }

    private SetActive(color : SwitchColor) : void {
        if (this.active === color) return;
        this.active = color;
        for (const listener of this.listeners) listener(this.active);
    }

    public Subscribe(listener : (active : SwitchColor) => void) : () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

export const ColorSwitchState = new ColorSwitchStateClass();
