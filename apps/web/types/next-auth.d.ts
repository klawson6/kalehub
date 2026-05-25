import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    accessToken: string
    userId: string
  }

  interface Profile {
    sub: string
    email: string
    name?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    accessToken: string
  }
}
