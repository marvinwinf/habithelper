import { applySubsetReorder } from '../reorder';

const item = (id: string) => ({ id });
const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

describe('applySubsetReorder', () => {
  it('applies the new order when the subset is the whole list', () => {
    const all = [item('a'), item('b'), item('c')];

    expect(ids(applySubsetReorder(all, ['c', 'a', 'b']))).toEqual(['c', 'a', 'b']);
  });

  it('keeps items outside the subset in their original positions', () => {
    // b and d are due today and get swapped; a, c, e are not due and must not
    // move — this is the case that used to scramble the Routines screen.
    const all = [item('a'), item('b'), item('c'), item('d'), item('e')];

    expect(ids(applySubsetReorder(all, ['d', 'b']))).toEqual(['a', 'd', 'c', 'b', 'e']);
  });

  it('reuses the subset positions rather than clustering the subset', () => {
    const all = [item('x'), item('a'), item('y'), item('b')];

    const result = applySubsetReorder(all, ['b', 'a']);

    expect(ids(result)).toEqual(['x', 'b', 'y', 'a']);
  });

  it('produces a stable, collision-free index for every item', () => {
    const all = [item('a'), item('b'), item('c'), item('d')];

    const sortOrders = applySubsetReorder(all, ['c', 'a']).map((entry, index) => ({
      id: entry.id,
      sortOrder: index,
    }));

    expect(new Set(sortOrders.map((entry) => entry.sortOrder)).size).toBe(all.length);
  });

  it('leaves the list unchanged when the subset order is unchanged', () => {
    const all = [item('a'), item('b'), item('c')];

    expect(ids(applySubsetReorder(all, ['a', 'c']))).toEqual(['a', 'b', 'c']);
  });

  it('ignores ids that are no longer in the list', () => {
    const all = [item('a'), item('b'), item('c')];

    // A routine deleted between the drag starting and finishing must not
    // shift the survivors by one.
    expect(ids(applySubsetReorder(all, ['c', 'deleted', 'a']))).toEqual(['c', 'b', 'a']);
  });

  it('returns an equivalent list for an empty subset', () => {
    const all = [item('a'), item('b')];

    expect(ids(applySubsetReorder(all, []))).toEqual(['a', 'b']);
  });

  it('does not mutate the input', () => {
    const all = [item('a'), item('b'), item('c')];
    const snapshot = ids(all);

    applySubsetReorder(all, ['c', 'a']);

    expect(ids(all)).toEqual(snapshot);
  });
});
