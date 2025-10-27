/**
 * Jest configuration for ESM + TypeScript using ts-jest.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // Transform .ts files using ts-jest with ESM support
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
  },
  // Module name mapper to resolve .js imports to .ts files
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Ensure node_modules are not transformed (except mcp-framework which is ESM)
  transformIgnorePatterns: ['/node_modules/'],
};
