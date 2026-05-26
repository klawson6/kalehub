import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { MessageInput } from './MessageInput';

const meta: Meta<typeof MessageInput> = {
  component: MessageInput,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof MessageInput>;

export const Default: Story = {
  args: {
    onSend: async (content: string) => {
      console.log('sent:', content);
    },
  },
};

export const SendInteraction: Story = {
  args: {
    onSend: async () => {},
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Message…') as HTMLInputElement;
    await userEvent.type(input, 'Hello world');
    await expect(input.value).toBe('Hello world');
    const button = canvas.getByRole('button', { name: 'Send' }) as HTMLButtonElement;
    await expect(button.disabled).toBe(false);
    await userEvent.click(button);
    await expect(input.value).toBe('');
  },
};

export const Disabled: Story = {
  args: {
    onSend: async () => {},
    disabled: true,
  },
};
