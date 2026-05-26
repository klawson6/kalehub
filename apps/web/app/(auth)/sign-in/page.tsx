import { signIn } from '@/lib/auth'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        action={async () => {
          'use server'
          await signIn('keycloak', { redirectTo: '/' })
        }}
      >
        <button type="submit">Sign in with Keycloak</button>
      </form>
    </main>
  )
}
