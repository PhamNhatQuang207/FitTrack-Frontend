import { createTestQueryClient } from '../test-utils/queryTestUtils';
import { queryKeys, invalidateWorkoutAndAnalytics } from './queryClient';

describe('queryClient helpers', () => {
  test('queryKeys produce stable deterministic arrays', () => {
    expect(queryKeys.exercises.byCategory('chest')).toEqual(['exercises', 'category', 'chest']);
    expect(queryKeys.workoutSessions.detail('s1')).toEqual(['workout-sessions', 's1']);
    expect(queryKeys.analytics.strengthProgression('Bench Press')).toEqual([
      'analytics',
      'strength-progression',
      'Bench Press',
    ]);
  });

  test('invalidateWorkoutAndAnalytics invalidates sessions, current schedule, analytics, and userProgress', async () => {
    const qc = createTestQueryClient();
    const spy = jest.spyOn(qc, 'invalidateQueries');

    await invalidateWorkoutAndAnalytics(qc);

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.workoutSessions.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.weeklySchedule.current });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['analytics'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.userProgress });
  });
});
