
export const keyStates: { [key: string]: boolean } = {};


export const keyActions: { [key: string]:
        {
            startFunc:() => void,
            endFunc:() => void,
            isActive: boolean,
            isEcho?: boolean,
        } } = {};


export const mousePosition = {x: 0, y: 0};

//TODO Replace this with WindowSettings
export const InputInfo = {
    gameHasFocus: true,
}