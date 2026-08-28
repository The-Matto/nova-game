import {useRef, useState} from "react";

//A number field with no spinner buttons: click to type, drag left/right to scrub (Blender/UE-
//style). Use this everywhere a numeric input is needed in the editor UI.
export const DragNumberInput = ({value, onChange, sensitivity = 0.1, min, max, className} : {
    value : number,
    onChange : (value : number) => void,
    sensitivity? : number,
    //UE-style ClampMin/ClampMax - out-of-range values (typed or dragged to) are clamped rather
    //than rejected.
    min? : number,
    max? : number,
    className? : string,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState("");
    const drag = useRef<{ startX : number, startValue : number, dragged : boolean } | null>(null);

    const clamp = (raw : number) => {
        let result = raw;
        if (min !== undefined) result = Math.max(min, result);
        if (max !== undefined) result = Math.min(max, result);
        return result;
    };

    const commitText = (raw : string) => {
        const trimmed = raw.trim();
        if (trimmed === '') return;
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed)) onChange(clamp(parsed));
    };

    const handleMouseDown = (e : React.MouseEvent) => {
        drag.current = {startX: e.clientX, startValue: value, dragged: false};

        const handleMove = (moveEvent : MouseEvent) => {
            if (!drag.current) return;
            const delta = moveEvent.clientX - drag.current.startX;
            if (Math.abs(delta) > 3) drag.current.dragged = true;
            if (drag.current.dragged) onChange(clamp(drag.current.startValue + delta * sensitivity));
        };

        const handleUp = () => {
            if (drag.current && !drag.current.dragged) {
                setText(String(value));
                setIsEditing(true);
            }
            drag.current = null;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    if (isEditing) {
        return <input
            type="text"
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={() => {
                commitText(text);
                setIsEditing(false);
            }}
            onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setIsEditing(false);
            }}
            className={className}
        />;
    }

    return <div onMouseDown={handleMouseDown} className={`${className} cursor-ew-resize select-none`}>
        {value.toFixed(2)}
    </div>;
};
