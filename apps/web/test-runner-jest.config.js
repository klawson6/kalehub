const { getJestConfig } = require('@storybook/test-runner');

const testRunnerConfig = getJestConfig();

module.exports = {
  ...testRunnerConfig,
  modulePathIgnorePatterns: [
    ...(testRunnerConfig.modulePathIgnorePatterns ?? []),
    '<rootDir>/packages/db/dist',
  ],
};
