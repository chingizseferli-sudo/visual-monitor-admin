import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  reset: vi.fn(),
  signOut: vi.fn(),
  consoleError: vi.fn(),
}))

const MOCK_HREF = 'https://app.test/dashboard?tab=1'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: mocks.signOut,
    },
  },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: { reset: mocks.reset },
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useLocation: () => ({ href: MOCK_HREF }),
  }
})

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(mocks.consoleError)
    mocks.signOut.mockResolvedValue({ error: null })
  })

  it('calls Supabase signOut, clears legacy auth, and navigates to sign-in', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce())
    expect(mocks.reset).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: MOCK_HREF },
      replace: true,
    })
  })

  it('still clears legacy auth and redirects when Supabase signOut fails', async () => {
    mocks.signOut.mockResolvedValue({
      error: { message: 'Network error' },
    })

    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce())
    expect(mocks.consoleError).toHaveBeenCalled()
    expect(mocks.reset).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: MOCK_HREF },
      replace: true,
    })
  })

  it('does not call Supabase signOut, reset, or navigate when Cancel is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Cancel$/i }))

    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.reset).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
