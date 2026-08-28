//Tracks the objectives a level requires before its goal volume lets the player finish. An
//implementer registers itself here, typically from its own BeginPlay.

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

    //For an objective destroyed outside a full level reset (e.g. Delete key) - without this it'd
    //stay registered forever, permanently incomplete.
    public static Unregister(objective : ILevelObjective) {
        const index = LevelObjectives.objectives.indexOf(objective);
        if (index !== -1) LevelObjectives.objectives.splice(index, 1);
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
