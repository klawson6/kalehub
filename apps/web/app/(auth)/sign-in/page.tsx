import { signIn } from '@/lib/auth'

export default function SignInPage() {
  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
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
