import { prisma } from '@kalehub/db';
import type { ConversationSummary } from './conversation.types.js';

const participantInclude = {
  participants: {
    select: {
      userId: true,
      user: { select: { id: true, email: true, name: true } },
    },
  },
} as const;

export interface IConversationRepository {
  findAllForUser(userId: string): Promise<ConversationSummary[]>;
  findById(id: string): Promise<ConversationSummary | null>;
  findByIdForUser(id: string, userId: string): Promise<ConversationSummary | null>;
  existsBetween(userId1: string, userId2: string): Promise<boolean>;
  create(requesterId: string, participantId: string): Promise<ConversationSummary>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
}

export class PrismaConversationRepository implements IConversationRepository {
  async findAllForUser(userId: string): Promise<ConversationSummary[]> {
    return prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: participantInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ConversationSummary | null> {
    return prisma.conversation.findUnique({
      where: { id },
      include: participantInclude,
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<ConversationSummary | null> {
    return prisma.conversation.findFirst({
      where: { id, participants: { some: { userId } } },
      include: participantInclude,
    });
  }

  async existsBetween(userId1: string, userId2: string): Promise<boolean> {
    const count = await prisma.conversation.count({
      where: {
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
          { participants: { every: { userId: { in: [userId1, userId2] } } } },
        ],
      },
    });
    return count > 0;
  }

  async create(requesterId: string, participantId: string): Promise<ConversationSummary> {
    return prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: requesterId }, { userId: participantId }],
        },
      },
      include: participantInclude,
    });
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const count = await prisma.conversationParticipant.count({
      where: { conversationId, userId },
    });
    return count > 0;
  }
}
