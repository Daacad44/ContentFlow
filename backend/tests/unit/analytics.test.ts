import { notificationService } from '../../src/services/notification.service';

describe('notificationService.checkCondition', () => {
  it('evaluates gt correctly', () => {
    expect(notificationService.checkCondition(5, 'gt', 3)).toBe(true);
    expect(notificationService.checkCondition(3, 'gt', 3)).toBe(false);
  });

  it('evaluates lte correctly', () => {
    expect(notificationService.checkCondition(3, 'lte', 3)).toBe(true);
    expect(notificationService.checkCondition(4, 'lte', 3)).toBe(false);
  });
});
