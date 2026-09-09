# Level Presets

Drop preset level JSON files here (same format as an exported/uploaded level - an
`actorsToSpawn` array, plus optional `worldSettings`), then add an entry to `manifest.json` so
the editor's "New Level" startup picker actually lists it - this is a static site, so there's no
way to discover files in this folder automatically.

```json
[
  {"name": "Empty Arena", "file": "empty-arena.json", "thumbnail": "empty-arena-thumbnail.png"}
]
```

`file` and `thumbnail` are both just filenames, resolved relative to this folder. `thumbnail` is
optional - a preset without one just shows a "No preview" placeholder in the picker.
