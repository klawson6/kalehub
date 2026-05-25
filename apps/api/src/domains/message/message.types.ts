import { z } from 'zod'

export const CreateMessageBody = z.object({
  content: z.string().min(1).max(4000),
})
export type CreateMessageInput = z.infer<typeof CreateMessageBody>

export const MessageQuerySchema = z.object({
  before: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
export type MessageQuery = z.infer<typeof MessageQuerySchema>

const SenderSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
})

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.date(),
  editedAt: z.date().nullable(),
  sender: SenderSchema,
})
export type MessageWithSender = z.infer<typeof MessageSchema>

export const MessagePageSchema = z.object({
  items: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
})
