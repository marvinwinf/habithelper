// Applies a drag-reorder that happened on a *subset* of a list back onto the
// full list.
//
// The Today screen only lists routines due today, but `routine.sort_order` is
// a single global ordering shared with the Routines screen
// (docs/DATA_MODEL.md). Reindexing just the dragged subset to 0..n-1 assigned
// values that collided with the routines Today never showed, so the Routines
// screen — which sorts purely by `sort_order` — saw duplicate keys and an
// arbitrary order among them. Reordering today's routines silently scrambled
// the full list.

/**
 * Reorders `all` so that the items named in `orderedSubsetIds` appear in that
 * new relative order, while every item outside the subset keeps its position.
 *
 * The subset's *slots* (the positions it already occupied in `all`) are
 * reused, so a routine that is not due today never moves just because two
 * routines around it were swapped.
 *
 * Ids in `orderedSubsetIds` that are not present in `all` are ignored; items
 * in `all` that are not in the subset are preserved. `all` is not mutated.
 */
export function applySubsetReorder<T extends { id: string }>(
  all: T[],
  orderedSubsetIds: string[],
): T[] {
  const byId = new Map(all.map((item) => [item.id, item]));
  // Only ids that actually exist, so a stale drag (against a routine deleted
  // in the meantime) cannot shift the remaining items by one.
  const reordered = orderedSubsetIds
    .map((id) => byId.get(id))
    .filter((item): item is T => item !== undefined);

  const subsetIds = new Set(reordered.map((item) => item.id));
  const result = [...all];
  let next = 0;
  for (let index = 0; index < result.length; index += 1) {
    if (subsetIds.has(result[index].id)) {
      result[index] = reordered[next];
      next += 1;
    }
  }
  return result;
}
