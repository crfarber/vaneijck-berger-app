import { describe, expect, it } from 'vitest';
import { createAllocationSections, hasActiveAllocations, type ListedAllocation } from './sections';

type Item = ListedAllocation & { id: string };

const item = (id: string, statuscode: number, name?: string, statecode = 0): Item => ({
  id,
  statuscode,
  statecode,
  incident: name === undefined ? null : { dn_name: name },
});

describe('createAllocationSections', () => {
  it('splits allocations into active, pending and vehicle releases', () => {
    const [active, pending, releases] = createAllocationSections(
      [item('a', 875920000, 'A'), item('b', 1, 'B'), item('c', 875920001, 'C')],
      [{ id: 'r1' }],
    );

    expect(active.type).toBe('active');
    expect(active.count).toBe(2);
    expect(pending.type).toBe('pending');
    expect(pending.count).toBe(1);
    expect(releases.type).toBe('vehicle_releases');
    expect(releases.count).toBe(1);
  });

  it('lists active allocations most recent first', () => {
    const [active] = createAllocationSections(
      [item('first', 875920000), item('second', 875920000), item('third', 875920000)],
      [],
    );

    expect(active.data.map((entry) => entry.id)).toEqual(['third', 'second', 'first']);
  });

  it('sorts pending allocations by incident name', () => {
    const [, pending] = createAllocationSections(
      [item('x', 1, 'Zwolle'), item('y', 1, 'Amsterdam'), item('z', 1, 'Utrecht'), item('w', 1)],
      [],
    );

    expect(pending.data.map((entry) => entry.id)).toEqual(['w', 'y', 'z', 'x']);
  });

  it('leaves out closed and unknown allocations', () => {
    const [active, pending] = createAllocationSections(
      [item('closed', 875920000, 'A', 1), item('unknown', 42, 'B')],
      [],
    );

    expect(active.count).toBe(0);
    expect(pending.count).toBe(0);
  });

  it('keeps a reassign-pending allocation in the active block', () => {
    const [active] = createAllocationSections([item('re', 875920007, 'A', 1)], []);
    expect(active.data.map((entry) => entry.id)).toEqual(['re']);
  });

  it('does not change the input', () => {
    const input = [
      item('a', 875920000),
      item('b', 875920000),
      item('c', 1, 'B'),
      item('d', 1, 'A'),
    ];
    const snapshot = input.map((entry) => entry.id);

    createAllocationSections(input, []);

    expect(input.map((entry) => entry.id)).toEqual(snapshot);
  });

  it('returns three empty blocks for no data', () => {
    const sections = createAllocationSections([], []);
    expect(sections.map((section) => section.count)).toEqual([0, 0, 0]);
  });
});

describe('hasActiveAllocations', () => {
  it('is true when an allocation is in progress', () => {
    expect(hasActiveAllocations(createAllocationSections([item('a', 875920000)], []))).toBe(true);
  });

  it('lets pending allocations and vehicle releases pass, like the old app', () => {
    const sections = createAllocationSections([item('p', 1, 'A')], [{ id: 'r1' }]);
    expect(hasActiveAllocations(sections)).toBe(false);
  });

  it('is false without any allocations', () => {
    expect(hasActiveAllocations(createAllocationSections([], []))).toBe(false);
  });
});
