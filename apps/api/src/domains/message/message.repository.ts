import { prisma } from '@kalehub/db'
import type { MessageWithSender } from './message.types.js'

export interface IMessageRepository {
  findByConversation(
    conversationId: string,
    opts: { before?: Date | undefined; limit: number },
  ): Promise<MessageWithSender[]>
  create(input: {
    conversationId: string
    senderId: string
    content: string
  }): Promise<MessageWithSender>
}

const senderSelect = {
  sender: { select: { id: true, email: true, name: true } },
} as const

export class PrismaMessageRepository implements IMessageRepository {
  async findByConversation(
    conversationId: string,
    { before, limit }: { before?: Date | undefined; limit: number },
  ): Promise<MessageWithSender[]> {
    return prisma.message.findMany({
      where: {
        conversationId,
        ...(before !== undefined ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: senderSelect,
    })
  }

  async create(input: {
    conversationId: string
    senderId: string
    content: string
  }): Promise<MessageWithSender> {
    return prisma.message.create({
      data: input,
      include: senderSelect,
    })
  }
}
