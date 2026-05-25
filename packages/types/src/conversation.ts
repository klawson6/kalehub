import type { UserDTO } from './user.js'

export interface ConversationDTO {
  id: string
  createdAt: string
  updatedAt: string
  participants: UserDTO[]
}
