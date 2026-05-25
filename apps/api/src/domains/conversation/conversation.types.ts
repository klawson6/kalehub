import { z } from 'zod'

export const CreateConversationBody = z.object({
  participantId: z.string().min(1),
})
export type CreateConversationInput = z.infer<typeof CreateConversationBody>

const ParticipantSchema = z.object({
  userId: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
})

export const ConversationSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  participants: z.array(ParticipantSchema),
})
export type ConversationSummary = z.infer<typeof ConversationSchema>
