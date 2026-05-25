import type { IMessageRepository } from './message.repository.js'
import type { MessageWithSender } from './message.types.js'
import type { IConversationRepository } from '../conversation/conversation.repository.js'
import type { CursorPage } from '../../shared/pagination.js'
import { buildCursorPage } from '../../shared/pagination.js'
import { ForbiddenError, NotFoundError } from '../../shared/errors.js'

export class MessageService {
  constructor(
    private readonly messageRepo: IMessageRepository,
    private readonly conversationRepo: IConversationRepository,
  ) {}

  async list(
    conversationId: string,
    userId: string,
    opts: { before?: string | undefined; limit: number },
  ): Promise<CursorPage<MessageWithSender>> {
    const isParticipant = await this.conversationRepo.isParticipant(conversationId, userId)
    if (!isParticipant) throw new ForbiddenError()

    const before = opts.before ? new Date(opts.before) : undefined
    const raw = await this.messageRepo.findByConversation(conversationId, {
      before,
      limit: opts.limit,
    })
    return buildCursorPage(raw, opts.limit, (m) => m.createdAt.toISOString())
  }

  async create(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<MessageWithSender> {
    const conversation = await this.conversationRepo.findById(conversationId)
    if (!conversation) throw new NotFoundError('Conversation', conversationId)

    const isParticipant = await this.conversationRepo.isParticipant(conversationId, senderId)
    if (!isParticipant) throw new ForbiddenError()

    return this.messageRepo.create({ conversationId, senderId, content })
  }
}
