import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-login-action-')).split(path.sep).join(path.posix.sep);

process.env = Object.assign({}, process.env, {
  TEMP: tmpDir,
  GITHUB_REPOSITORY: 'docker/login-action',
  RUNNER_TEMP: path.join(tmpDir, 'runner-temp').split(path.sep).join(path.posix.sep),
  RUNNER_TOOL_CACHE: path.join(tmpDir, 'runner-tool-cache').split(path.sep).join(path.posix.sep)
}) as {
  [key: string]: string;
};

module.exports = {
  clearMocks: true,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapper: {
    '^csv-parse/sync': '<rootDir>/node_modules/csv-parse/dist/cjs/sync.cjs'
  },
  collectCoverageFrom: ['src/**/{!(main.ts),}.ts'],
  coveragePathIgnorePatterns: ['lib/', 'node_modules/', '__tests__/'],
  verbose: true
};
