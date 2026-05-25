export interface MessageDTO {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
  editedAt: string | null
}
