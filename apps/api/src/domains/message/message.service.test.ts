import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { IConversationRepository } from '../conversation/conversation.repository.js';
import type { ConversationSummary } from '../conversation/conversation.types.js';
import type { IMessageRepository } from './message.repository.js';
import { MessageService } from './message.service.js';
import type { MessageWithSender } from './message.types.js';

const makeMessage = (overrides: Partial<MessageWithSender> = {}): MessageWithSender => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-a',
  content: 'Hello',
  createdAt: new Date('2024-01-01T12:00:00Z'),
  editedAt: null,
  sender: { id: 'user-a', email: 'a@test.com', name: null },
  ...overrides,
});

const makeConversation = (id = 'conv-1'): ConversationSummary => ({
  id,
  createdAt: new Date(),
  participants: [
    { userId: 'user-a', user: { id: 'user-a', email: 'a@test.com', name: null } },
    { userId: 'user-b', user: { id: 'user-b', email: 'b@test.com', name: null } },
  ],
});

function makeRepos() {
  const messageRepo: IMessageRepository = {
    findByConversation: vi.fn(),
    create: vi.fn(),
  };
  const conversationRepo: IConversationRepository = {
    findAllForUser: vi.fn(),
    findById: vi.fn(),
    findByIdForUser: vi.fn(),
    existsBetween: vi.fn(),
    create: vi.fn(),
    isParticipant: vi.fn(),
  };
  return { messageRepo, conversationRepo };
}

describe('MessageService', () => {
  let messageRepo: IMessageRepository;
  let conversationRepo: IConversationRepository;
  let service: MessageService;

  beforeEach(() => {
    const repos = makeRepos();
    messageRepo = repos.messageRepo;
    conversationRepo = repos.conversationRepo;
    service = new MessageService(messageRepo, conversationRepo);
  });

  describe('list', () => {
    it('returns a cursor page for a participant', async () => {
      const msgs = [makeMessage({ id: 'msg-1' }), makeMessage({ id: 'msg-2' })];
      vi.mocked(conversationRepo.isParticipant).mockResolvedValue(true);
      // service requests limit+1 rows to detect hasMore; return exactly limit here
      vi.mocked(messageRepo.findByConversation).mockResolvedValue(msgs);

      const result = await service.list('conv-1', 'user-a', { limit: 50 });

      expect(conversationRepo.isParticipant).toHaveBeenCalledWith('conv-1', 'user-a');
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it('returns nextCursor when there are more pages', async () => {
      // request limit=2 — service fetches limit+1=3, we return 3 items
      const msgs = [
        makeMessage({ id: 'msg-1', createdAt: new Date('2024-01-01T10:00:00Z') }),
        makeMessage({ id: 'msg-2', createdAt: new Date('2024-01-01T11:00:00Z') }),
        makeMessage({ id: 'msg-3', createdAt: new Date('2024-01-01T12:00:00Z') }),
      ];
      vi.mocked(conversationRepo.isParticipant).mockResolvedValue(true);
      vi.mocked(messageRepo.findByConversation).mockResolvedValue(msgs);

      const result = await service.list('conv-1', 'user-a', { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('2024-01-01T11:00:00.000Z');
    });

    it('passes before date to the repository when provided', async () => {
      vi.mocked(conversationRepo.isParticipant).mockResolvedValue(true);
      vi.mocked(messageRepo.findByConversation).mockResolvedValue([]);

      await service.list('conv-1', 'user-a', {
        before: '2024-01-01T12:00:00.000Z',
        limit: 50,
      });

      expect(messageRepo.findByConversation).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ before: new Date('2024-01-01T12:00:00.000Z') }),
      );
    });

    it('throws ForbiddenError when user is not a participant', async () => {
      vi.mocked(conversationRepo.isParticipant).mockResolvedValue(false);

      await expect(service.list('conv-1', 'user-x', { limit: 50 })).rejects.toThrow(ForbiddenError);
      expect(messageRepo.findByConversation).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates a message for a valid participant', async () => {
      const msg = makeMessage();
      vi.mocked(conversationRepo.findById).mockResolvedValue(makeConversation());
      vi.mocked(conversationRepo.isParticipant).mockResolvedValue(true);
      vi.mocked(messageRepo.create).mockResolvedValue(msg);

      const result = await service.create('conv-1', 'user-a', 'Hello');

      expect(messageRepo.create).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        senderId: 'user-a',
        content: 'Hello',
      });
      expect(result).toEqual(msg);
    });

    it('throws NotFoundError when conversation does not exist', async () => {
      vi.mocked(conversationRepo.findById).mockResolvedValue(null);

      await expect(service.create('conv-bad', 'user-a', 'Hello')).rejects.toThrow(NotFoundError);
      expect(messageRepo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when sender is not a participant', async () => {
      vi.mocked(conversationRepo.findById).mockResolvedValue(makeConversation());
      vi.mocked(conversationRepo.isParticipant).mockResolvedValue(false);

      await expect(service.create('conv-1', 'user-x', 'Hello')).rejects.toThrow(ForbiddenError);
      expect(messageRepo.create).not.toHaveBeenCalled();
    });
  });
});
