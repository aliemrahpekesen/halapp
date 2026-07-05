import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Allow NodeNext-style ".js" import specifiers to resolve to ".ts" sources.
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    pool: 'forks',
    testTimeout: 20000,
  },
});
