
import {PlayerController} from "../Actors/PlayerController";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter";


export const CameraSettings = {
    fov: 90,
    nearClip: 0.1,
    farClip: 1000,

};

export const PlayerSettings = {
    mouseSensitivityX: 5.0,
    mouseSensitivityY: 5.0,
}

export const WindowSettings = {
    windowHeight: 750,
    windowWidth: 1000,
    isPaused: false
};

export const GameStats = {
    fps: 60,
    deltaTime: 1.0
};


interface IPlayerStatics {
    PlayerController?: PlayerController;
    PlayerCharacter?:  NVPlayerCharacter;
    //Gamemode
    //NetDriver
}

export const PlayerStatics : IPlayerStatics = {};
