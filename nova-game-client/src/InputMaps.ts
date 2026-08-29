
export const keyStates: { [key: string]: boolean } = {};


export const keyActions: { [key: string]:
        {
            startFunc:() => void,
            endFunc:() => void,
            isActive: boolean,
            isEcho?: boolean,
        } } = {};


export const mousePosition = {x: 0, y: 0};

//Raw modifier state, tracked independently of keyActions (which only covers pre-registered
//player-movement binds) - see EditorSelection's Alt-drag-to-duplicate gizmo behavior.
export const ModifierKeys = {isAltDown: false};

//TODO Replace this with WindowSettings
export const InputInfo = {
    gameHasFocus: true,
}