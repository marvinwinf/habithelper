// Shared layout constants for list rows.
//
// Routine and task cards sit interleaved on the Today screen; a shared
// minimum height keeps every list card exactly uniform regardless of whether
// an individual card has a subtitle (docs/DESIGN_SYSTEM.md's Routine and
// Task Item Design). Uniform heights are also load-bearing for
// ReorderableList, whose drag math assumes a constant row pitch.
// Kept compact (rather than the earlier 76) so more routines/tasks fit on the
// Today screen at once; two text lines plus the tightened row padding still
// clear this floor, so the value stays a genuine shared minimum rather than a
// clipping hard height.
export const listCardMinHeight = 60;
