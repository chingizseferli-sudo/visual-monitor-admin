import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { SignUpForm } from './sign-up-form'

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  confirmPasswordEmpty: 'Please confirm your password.',
  passwordMismatch: "Passwords don't match.",
} as const

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signUp: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
    },
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

async function fillValidForm(
  emailInput: Locator,
  passwordInput: Locator,
  confirmPasswordInput: Locator
) {
  await userEvent.fill(emailInput, 'customer@example.com')
  await userEvent.fill(passwordInput, '1234567')
  await userEvent.fill(confirmPasswordInput, '1234567')
}

describe('SignUpForm', () => {
  let screen: RenderResult
  let emailInput: Locator
  let passwordInput: Locator
  let confirmPasswordInput: Locator
  let submitButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'customer@example.com' },
        session: null,
      },
      error: null,
    })

    screen = await render(<SignUpForm />)
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    passwordInput = screen.getByLabelText(/^Password$/i)
    confirmPasswordInput = screen.getByLabelText(/^Confirm Password$/i)
    submitButton = screen.getByRole('button', { name: /^Create Account$/i })
  })

  it('renders fields and submit button', async () => {
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(passwordInput).toBeInTheDocument()
    await expect.element(confirmPasswordInput).toBeInTheDocument()
    await expect.element(submitButton).toBeInTheDocument()
  })

  it('shows validation messages and prevents invalid submit', async () => {
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.emailEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.confirmPasswordEmpty))
      .toBeInTheDocument()
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it('shows a mismatch error and prevents Supabase call when passwords do not match', async () => {
    await userEvent.fill(emailInput, 'customer@example.com')
    await userEvent.fill(passwordInput, '1234567')
    await userEvent.fill(confirmPasswordInput, '7654321')

    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordMismatch))
      .toBeInTheDocument()
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it('creates an account without session, shows confirmation message, and redirects to sign-in', async () => {
    await fillValidForm(emailInput, passwordInput, confirmPasswordInput)

    await userEvent.click(submitButton)

    await vi.waitFor(() => {
      expect(mocks.signUp).toHaveBeenCalledWith({
        email: 'customer@example.com',
        password: '1234567',
      })
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        'Qeydiyyat yaradıldı. Emailinizi yoxlayın və hesabı təsdiqləyin.'
      )
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/sign-in',
        replace: true,
      })
    })
  })

  it('creates an account with an immediate session and redirects to monitor', async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'customer@example.com' },
        session: { access_token: 'token' },
      },
      error: null,
    })

    await fillValidForm(emailInput, passwordInput, confirmPasswordInput)

    await userEvent.click(submitButton)

    await vi.waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        'Qeydiyyat uğurla tamamlandı.'
      )
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/monitor',
        replace: true,
      })
    })
  })

  it('shows Supabase error and does not redirect', async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })

    await fillValidForm(emailInput, passwordInput, confirmPasswordInput)

    await userEvent.click(submitButton)

    await vi.waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('User already registered')
      expect(mocks.navigate).not.toHaveBeenCalled()
    })
  })

  it('disables submit while submitting', async () => {
    let resolveSignUp: (value: unknown) => void
    mocks.signUp.mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve
      })
    )

    await fillValidForm(emailInput, passwordInput, confirmPasswordInput)

    await userEvent.click(submitButton)
    await expect.element(submitButton).toBeDisabled()

    resolveSignUp!({
      data: {
        user: { id: 'user-1', email: 'customer@example.com' },
        session: null,
      },
      error: null,
    })

    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalled())
  })
})
