import type { Meta, StoryObj } from '@storybook/react'
import { ConversationItem } from './ConversationItem'

const conversation = {
  id: 'conv-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  participants: [
    { id: 'user-1', email: 'me@example.com', name: 'Me', createdAt: new Date().toISOString() },
    { id: 'user-2', email: 'alice@example.com', name: 'Alice Smith', createdAt: new Date().toISOString() },
  ],
}

const meta: Meta<typeof ConversationItem> = {
  component: ConversationItem,
  parameters: { nextjs: { appDirectory: true } },
}
export default meta

type Story = StoryObj<typeof ConversationItem>

export const Default: Story = {
  args: { conversation, currentUserId: 'user-1' },
}

export const NoName: Story = {
  args: {
    conversation: {
      ...conversation,
      participants: [
        ...conversation.participants.slice(0, 1),
        { id: 'user-3', email: 'bob@example.com', name: null, createdAt: new Date().toISOString() },
      ],
    },
    currentUserId: 'user-1',
  },
}
