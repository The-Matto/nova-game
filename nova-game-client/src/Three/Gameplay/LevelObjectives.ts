//Tracks the objectives a level requires before its goal volume will let the player finish.
//Nothing implements ILevelObjective yet (e.g. "shoot all targets") - once something does, it
//registers itself here (typically from its own BeginPlay) and this needs no changes.

export interface ILevelObjective {
    //Shown to the player when listing what's still incomplete.
    readonly label : string;

    IsComplete() : boolean;
}

export class LevelObjectives {

    private static objectives : ILevelObjective[] = [];

    public static Register(objective : ILevelObjective) {
        LevelObjectives.objectives.push(objective);
    }

    //TODO Call this on level unload/reload once that exists, so objectives don't leak between
    //levels/runs.
    public static Clear() {
        LevelObjectives.objectives = [];
    }

    public static AllComplete() : boolean {
        return LevelObjectives.objectives.every(o => o.IsComplete());
    }

    public static GetIncomplete() : ILevelObjective[] {
        return LevelObjectives.objectives.filter(o => !o.IsComplete());
    }
}
