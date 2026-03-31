
export const keyStates: { [key: string]: boolean } = {};


export const keyActions: { [key: string]:
        {
            startFunc:() => void,
            endFunc:() => void,
            isActive: boolean
        } } = {};


export const mousePosition = {x: 0, y: 0};

export const virtualCursorPosition = {x: 0, y: 0};

//TODO Replace this with WindowSettings
export const InputInfo = {
    gameHasFocus: true,
}