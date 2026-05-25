import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.tsx'],
  addons: [],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
}

export default config
