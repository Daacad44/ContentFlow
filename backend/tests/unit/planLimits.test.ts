import { UsageMetric } from '@prisma/client';
import { crossedThreshold, exceedsLimit, readLimit } from '../../src/services/billing.service';

describe('readLimit', () => {
  const free = { posts: 10, aiGenerations: 5, teamMembers: 2, creativeAssets: 5 };

  it('reads the limit for each metric', () => {
    expect(readLimit(free, UsageMetric.POSTS)).toBe(10);
    expect(readLimit(free, UsageMetric.AI_GENERATIONS)).toBe(5);
    expect(readLimit(free, UsageMetric.TEAM_MEMBERS)).toBe(2);
  });

  it('treats -1, missing and invalid values as unlimited', () => {
    expect(readLimit({ posts: -1 }, UsageMetric.POSTS)).toBeNull();
    expect(readLimit({}, UsageMetric.POSTS)).toBeNull();
    expect(readLimit({ posts: 'ten' }, UsageMetric.POSTS)).toBeNull();
    expect(readLimit(null, UsageMetric.POSTS)).toBeNull();
  });
});

describe('exceedsLimit', () => {
  it('allows usage up to and including the limit', () => {
    expect(exceedsLimit(10, 9)).toBe(false);
    expect(exceedsLimit(10, 10)).toBe(true);
    expect(exceedsLimit(0, 0)).toBe(true);
  });

  it('never blocks unlimited plans', () => {
    expect(exceedsLimit(null, 1_000_000)).toBe(false);
  });
});

describe('crossedThreshold', () => {
  it('fires once when 90% is first reached', () => {
    expect(crossedThreshold(10, 8, 9)).toBe(0.9);
    expect(crossedThreshold(10, 9, 9)).toBeNull();
  });

  it('fires once when the limit is reached', () => {
    expect(crossedThreshold(10, 9, 10)).toBe(1);
    expect(crossedThreshold(10, 10, 11)).toBeNull();
  });

  it('ignores unlimited plans', () => {
    expect(crossedThreshold(null, 0, 100)).toBeNull();
  });
});
