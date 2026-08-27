import type {NVActor} from "../Actor.ts";

//Marks a field as editable from the inspector panel while its actor is selected - same pattern
//as @ReplicatedVariable (see ../Replication.ts). The panel infers the widget from the value's
//type - see NVActor.GetEditableProperties and EditorInspectorPanel.
export const EditableProperty = (target: object, propertyKey: string | symbol) => {
    const value = target.constructor as typeof NVActor;
    if (!value.editableProperties) value.editableProperties = new Set<string>();
    value.editableProperties.add(propertyKey.toString());
};
