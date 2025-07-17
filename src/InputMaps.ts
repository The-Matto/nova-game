
export const keyStates: { [key: string]: boolean } = {};


export const keyActions: { [key: string]:
        {
            startFunc:() => void,
            endFunc:() => void,
            isActive: boolean
        } } = {};


//TODO I can probably merge this in to a single object for mouse based properties
export const mousePosition = {x: 0, y: 0};


export const InputInfo = {
    gameHasFocus: false,
    mouseSensitivity: 3
}