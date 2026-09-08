//The fixed set of tags a level can be uploaded with (see LevelsApi.ts's upload validation) -
//deliberately closed rather than free-text, so the level browser's tag filter stays a small,
//predictable set of buttons instead of a sprawling list of one-off strings.
export const LEVEL_TAGS = [
    "Parkour",
    "Combat",
    "Puzzle",
    "Precision",
    "Speedrun",
    "Beginner Friendly",
    "Hard",
    "Short",
    "Long",
    "Vertical",
] as const;

export type LevelTag = typeof LEVEL_TAGS[number];

export function IsLevelTag(value : unknown) : value is LevelTag {
    return typeof value === "string" && (LEVEL_TAGS as readonly string[]).includes(value);
}
