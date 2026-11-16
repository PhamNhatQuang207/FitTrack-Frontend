import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min default; public catalogs override to 5 min
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  siteConfig: ['site-config'],
  muscleGroups: ['muscle-groups'],
  exercises: {
    all: ['exercises'],
    byCategory: (slug) => ['exercises', 'category', slug],
  },
  userProgress: ['user-progress'],
  workoutSessions: {
    all: ['workout-sessions'],
    detail: (id) => ['workout-sessions', id],
  },
  weeklyPlans: {
    all: ['weekly-plans'],
    detail: (id) => ['weekly-plans', id],
  },
  weeklySchedule: {
    current: ['weekly-schedule', 'current'],
  },
  analytics: {
    userExercises: ['analytics', 'user-exercises'],
    workoutStats: ['analytics', 'workout-stats'],
    weeklyProgress: ['analytics', 'weekly-progress'],
    strengthProgression: (exerciseName) => ['analytics', 'strength-progression', exerciseName],
  },
  ai: {
    conversations: ['ai', 'conversations'],
    conversation: (id) => ['ai', 'conversations', id],
    memories: ['ai', 'memories'],
    mcpKey: ['ai', 'mcp-key'],
  },
};

export const invalidateWorkoutAndAnalytics = async (qc = queryClient) => {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.workoutSessions.all }),
    qc.invalidateQueries({ queryKey: queryKeys.weeklySchedule.current }),
    qc.invalidateQueries({ queryKey: ['analytics'] }),
    qc.invalidateQueries({ queryKey: queryKeys.userProgress }),
  ]);
};
