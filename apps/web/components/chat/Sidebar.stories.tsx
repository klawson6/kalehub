import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from './Sidebar';

const makeConv = (id: string, name: string) => ({
  id,
  createdAt: new Date().toISOString(),
  participants: [
    { userId: 'me', user: { id: 'me', email: 'me@example.com', name: 'Me' } },
    {
      userId: `other-${id}`,
      user: { id: `other-${id}`, email: `${name.toLowerCase()}@example.com`, name },
    },
  ],
});

const meta: Meta<typeof Sidebar> = {
  component: Sidebar,
  parameters: { nextjs: { appDirectory: true }, layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof Sidebar>;

export const WithConversations: Story = {
  args: {
    conversations: [makeConv('1', 'Alice'), makeConv('2', 'Bob'), makeConv('3', 'Charlie')],
    currentUserId: 'me',
  },
};

export const Empty: Story = {
  args: { conversations: [], currentUserId: 'me' },
};
