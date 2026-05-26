import type { Meta, StoryObj } from '@storybook/react';
import { MessageList } from './MessageList';

const now = Date.now();
const messages = [
  {
    id: '1',
    conversationId: 'c1',
    senderId: 'other',
    content: 'Hey, how are you?',
    createdAt: new Date(now - 60000).toISOString(),
    editedAt: null,
  },
  {
    id: '2',
    conversationId: 'c1',
    senderId: 'me',
    content: 'Doing great! Working on a chat app.',
    createdAt: new Date(now - 50000).toISOString(),
    editedAt: null,
  },
  {
    id: '3',
    conversationId: 'c1',
    senderId: 'other',
    content: 'Nice, what tech stack?',
    createdAt: new Date(now - 40000).toISOString(),
    editedAt: null,
  },
  {
    id: '4',
    conversationId: 'c1',
    senderId: 'me',
    content: 'Next.js, Fastify, Socket.io, Redis.',
    createdAt: new Date(now - 30000).toISOString(),
    editedAt: null,
  },
];

const meta: Meta<typeof MessageList> = {
  component: MessageList,
  decorators: [
    (Story: React.ComponentType) => (
      <div className="flex flex-col h-[500px] w-[600px]">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof MessageList>;

export const Mixed: Story = {
  args: { messages, currentUserId: 'me' },
};

export const Empty: Story = {
  args: { messages: [], currentUserId: 'me' },
};
