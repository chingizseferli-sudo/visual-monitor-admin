import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  component: HealthPage,
})

function HealthPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname !== '/health') {
    return <Outlet />
  }

  return <div>Visual Monitor OK</div>
}
