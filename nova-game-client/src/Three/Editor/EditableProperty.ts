import type {NVActor} from "../Actor.ts";

//Per-field options for @EditableProperty: min/max clamp a numeric value (UE ClampMin/ClampMax);
//editCondition names another field that gates visibility when falsy (UE EditConditionHides).
export interface EditablePropertyOptions {
    min? : number;
    max? : number;
    editCondition? : string;
}

//Marks a field as editable in the inspector panel while selected - same pattern as
//@ReplicatedVariable. Widget is inferred from the value's type (see EditorInspectorPanel).
export const EditableProperty = (options : EditablePropertyOptions = {}) =>
    (target : object, propertyKey : string | symbol) => {
        const ctor = target.constructor as typeof NVActor;
        if (!ctor.editableProperties) ctor.editableProperties = new Map<string, EditablePropertyOptions>();
        ctor.editableProperties.set(propertyKey.toString(), options);
    };
