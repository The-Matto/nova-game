import type {NVActor} from "../Actor.ts";

//Per-field options for @EditableProperty: min/max clamp a numeric value (UE ClampMin/ClampMax);
//editCondition names another field that gates visibility when falsy (UE EditConditionHides);
//choices renders a dropdown of fixed string values instead of a free-text input.
export interface EditablePropertyOptions {
    min? : number;
    max? : number;
    editCondition? : string;
    choices? : string[];
    //Rounds to a whole number (drag, type, and display) - see DragNumberInput.
    isInteger? : boolean;
    //Value change per pixel dragged - see DragNumberInput. Defaults to its own 0.1, which is far
    //too fine for a field whose useful range is in the hundreds/thousands (e.g. a fog distance) -
    //set this to match how a hand-rolled slider for the same kind of value feels elsewhere (e.g.
    //EditorWorldSettingsPanel's own Fog Distance).
    sensitivity? : number;
}

//Marks a field as editable in the inspector panel while selected - same pattern as
//@ReplicatedVariable. Widget is inferred from the value's type (see EditorInspectorPanel).
export const EditableProperty = (options : EditablePropertyOptions = {}) =>
    (target : object, propertyKey : string | symbol) => {
        const ctor = target.constructor as typeof NVActor;
        if (!ctor.editableProperties) ctor.editableProperties = new Map<string, EditablePropertyOptions>();
        ctor.editableProperties.set(propertyKey.toString(), options);
    };
