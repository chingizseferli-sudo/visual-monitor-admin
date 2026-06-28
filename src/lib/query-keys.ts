export const customerQueryKeys = {
  all: ['customer'] as const,
  dashboard: () => [...customerQueryKeys.all, 'dashboard'] as const,
  monitors: () => [...customerQueryKeys.all, 'monitors'] as const,
  results: () => [...customerQueryKeys.all, 'results'] as const,
  alerts: () => [...customerQueryKeys.all, 'alerts'] as const,
  profile: () => [...customerQueryKeys.all, 'profile'] as const,
}
