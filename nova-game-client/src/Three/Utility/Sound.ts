import {PlayerSettings} from "./PlayerGlobals";

const SOUND_PATHS = {
    fireWeapon: '/audio/fire-weapon.wav',
    uiClick: '/audio/ui-click.wav',
    uiHover: '/audio/ui-hover.wav',
    playerDeath: '/audio/player-death.wav',
    levelComplete: '/audio/level-complete.wav',
    spikesExtend: '/audio/spikes-extend.wav',
    spikesRetract: '/audio/spikes-retract.wav',
    cannonFire: '/audio/cannon-fire.wav',
} as const;

export type SoundName = keyof typeof SOUND_PATHS;

//Applied on top of every individual PlaySound call's own volume - a single global knob for
//"everything's too loud" rather than having to retune each call site/sound separately.
const GLOBAL_VOLUME_SCALE = 0.5;

//One base HTMLAudioElement per sound, lazily created - actual playback always goes through a
//cloneNode() of it instead, so overlapping plays (e.g. rapid-fire gunshots) each get their own
//independent playhead rather than restarting/cutting off whatever's already playing.
const baseElements = new Map<SoundName, HTMLAudioElement>();

export function PlaySound(name : SoundName, volume : number = 1) : void {
    let base = baseElements.get(name);
    if (!base) {
        base = new Audio(SOUND_PATHS[name]);
        baseElements.set(name, base);
    }

    const instance = base.cloneNode() as HTMLAudioElement;
    instance.volume = volume * GLOBAL_VOLUME_SCALE * (PlayerSettings.soundVolume / 100);
    //Browsers block audio before any user gesture on the page - not worth surfacing if one of
    //these four ever somehow fires before that.
    instance.play().catch(() => {});
}
