export interface ConversationParticipantDTO {
  userId: string
  user: { id: string; email: string; name: string | null }
}

export interface ConversationDTO {
  id: string
  createdAt: string
  participants: ConversationParticipantDTO[]
}
