import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConversationService } from './conversation.service.js'
import type { IConversationRepository } from './conversation.repository.js'
import type { IUserRepository } from '../user/user.repository.js'
import type { ConversationSummary } from './conversation.types.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'

const makeConversation = (id = 'conv-1'): ConversationSummary => ({
  id,
  createdAt: new Date(),
  participants: [
    { userId: 'user-a', user: { id: 'user-a', email: 'a@test.com', name: null } },
    { userId: 'user-b', user: { id: 'user-b', email: 'b@test.com', name: null } },
  ],
})

const makeUser = (id = 'user-b') => ({
  id,
  email: `${id}@test.com`,
  name: null,
  keycloakId: `kc-${id}`,
  createdAt: new Date(),
  updatedAt: new Date(),
})

function makeRepos() {
  const conversationRepo: IConversationRepository = {
    findAllForUser: vi.fn(),
    findById: vi.fn(),
    existsBetween: vi.fn(),
    create: vi.fn(),
    isParticipant: vi.fn(),
  }
  const userRepo: IUserRepository = {
    upsert: vi.fn(),
    findById: vi.fn(),
  }
  return { conversationRepo, userRepo }
}

describe('ConversationService', () => {
  let conversationRepo: IConversationRepository
  let userRepo: IUserRepository
  let service: ConversationService

  beforeEach(() => {
    const repos = makeRepos()
    conversationRepo = repos.conversationRepo
    userRepo = repos.userRepo
    service = new ConversationService(conversationRepo, userRepo)
  })

  describe('listForUser', () => {
    it('returns conversations from the repository', async () => {
      const convs = [makeConversation()]
      vi.mocked(conversationRepo.findAllForUser).mockResolvedValue(convs)

      const result = await service.listForUser('user-a')

      expect(conversationRepo.findAllForUser).toHaveBeenCalledWith('user-a')
      expect(result).toEqual(convs)
    })
  })

  describe('create', () => {
    it('creates a DM conversation between two valid users', async () => {
      const conv = makeConversation()
      vi.mocked(userRepo.findById).mockResolvedValue(makeUser('user-b'))
      vi.mocked(conversationRepo.existsBetween).mockResolvedValue(false)
      vi.mocked(conversationRepo.create).mockResolvedValue(conv)

      const result = await service.create('user-a', { participantId: 'user-b' })

      expect(userRepo.findById).toHaveBeenCalledWith('user-b')
      expect(conversationRepo.existsBetween).toHaveBeenCalledWith('user-a', 'user-b')
      expect(conversationRepo.create).toHaveBeenCalledWith('user-a', 'user-b')
      expect(result).toEqual(conv)
    })

    it('throws ConflictError when requester tries to DM themselves', async () => {
      await expect(service.create('user-a', { participantId: 'user-a' })).rejects.toThrow(
        ConflictError,
      )
      expect(userRepo.findById).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when participant does not exist', async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(null)

      await expect(service.create('user-a', { participantId: 'user-b' })).rejects.toThrow(
        NotFoundError,
      )
      expect(conversationRepo.existsBetween).not.toHaveBeenCalled()
    })

    it('throws ConflictError when a DM already exists between the two users', async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(makeUser('user-b'))
      vi.mocked(conversationRepo.existsBetween).mockResolvedValue(true)

      await expect(service.create('user-a', { participantId: 'user-b' })).rejects.toThrow(
        ConflictError,
      )
      expect(conversationRepo.create).not.toHaveBeenCalled()
    })
  })
})
