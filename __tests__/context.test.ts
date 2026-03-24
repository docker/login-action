import {afterEach, expect, test} from 'vitest';
import * as path from 'path';

import {Buildx} from '@docker/actions-toolkit/lib/buildx/buildx.js';

import {getAuthList, getInputs} from '../src/context.js';

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('INPUT_')) {
      delete process.env[key];
    }
  }
});

test('with password and username getInputs does not throw error', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  process.env['INPUT_LOGOUT'] = 'true';
  expect(() => {
    getInputs();
  }).not.toThrow();
});

test('getAuthList uses the default Docker Hub registry when computing scoped config dir', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  process.env['INPUT_SCOPE'] = 'myscope';
  process.env['INPUT_LOGOUT'] = 'false';
  const [auth] = getAuthList(getInputs());
  expect(auth).toMatchObject({
    registry: 'docker.io',
    configDir: path.join(Buildx.configDir, 'config', 'registry-1.docker.io', 'myscope')
  });
});
