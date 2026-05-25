export interface UpsertUserInput {
  keycloakId: string
  email: string
  name: string | null
}

export interface UserResponse {
  id: string
  email: string
  name: string | null
  createdAt: Date
}
