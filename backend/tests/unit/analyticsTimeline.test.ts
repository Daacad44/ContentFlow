import { buildDailyTimeline, halfOverHalfGrowth } from '../../src/services/analytics.service';

describe('buildDailyTimeline', () => {
  const range = { from: new Date('2026-06-01T10:00:00Z'), to: new Date('2026-06-04T08:00:00Z') };

  it('returns one entry per day, including empty days', () => {
    const timeline = buildDailyTimeline(
      [new Date('2026-06-01T12:00:00Z'), new Date('2026-06-01T18:00:00Z'), new Date('2026-06-03T09:00:00Z')],
      range,
    );
    expect(timeline).toEqual([
      { date: '2026-06-01', count: 2 },
      { date: '2026-06-02', count: 0 },
      { date: '2026-06-03', count: 1 },
      { date: '2026-06-04', count: 0 },
    ]);
  });

  it('returns an empty list for an inverted range', () => {
    expect(buildDailyTimeline([], { from: range.to, to: range.from })).toEqual([]);
  });

  it('caps very long ranges to the most recent 366 days', () => {
    const timeline = buildDailyTimeline([], {
      from: new Date('2020-01-01T00:00:00Z'),
      to: new Date('2026-06-04T00:00:00Z'),
    });
    expect(timeline).toHaveLength(366);
    expect(timeline[timeline.length - 1].date).toBe('2026-06-04');
  });
});

describe('halfOverHalfGrowth', () => {
  it('compares the second half of the period to the first half', () => {
    expect(halfOverHalfGrowth([{ count: 2 }, { count: 2 }, { count: 3 }, { count: 3 }])).toBe(50);
  });

  it('returns null when there is no baseline', () => {
    expect(halfOverHalfGrowth([{ count: 0 }, { count: 5 }])).toBeNull();
    expect(halfOverHalfGrowth([{ count: 1 }])).toBeNull();
  });
});
