import type { IConversationRepository } from './conversation.repository.js'
import type { ConversationSummary } from './conversation.types.js'
import type { IUserRepository } from '../user/user.repository.js'
import type { CreateConversationInput } from './conversation.types.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'

export class ConversationService {
  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async listForUser(userId: string): Promise<ConversationSummary[]> {
    return this.conversationRepo.findAllForUser(userId)
  }

  async findByIdForUser(id: string, userId: string): Promise<ConversationSummary | null> {
    return this.conversationRepo.findByIdForUser(id, userId)
  }

  async create(requesterId: string, input: CreateConversationInput): Promise<ConversationSummary> {
    if (requesterId === input.participantId) {
      throw new ConflictError('Cannot create a conversation with yourself')
    }

    const participant = await this.userRepo.findById(input.participantId)
    if (!participant) throw new NotFoundError('User', input.participantId)

    const exists = await this.conversationRepo.existsBetween(requesterId, input.participantId)
    if (exists) throw new ConflictError('A conversation with this user already exists')

    return this.conversationRepo.create(requesterId, input.participantId)
  }
}
