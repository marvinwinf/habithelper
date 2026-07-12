// Shared layout constants for list rows.
//
// Routine and task cards sit interleaved on the Today screen; a shared
// minimum height keeps every list card exactly uniform regardless of whether
// an individual card has a subtitle (docs/DESIGN_SYSTEM.md's Routine and
// Task Item Design). Uniform heights are also load-bearing for
// ReorderableList, whose drag math assumes a constant row pitch.
export const listCardMinHeight = 76;
