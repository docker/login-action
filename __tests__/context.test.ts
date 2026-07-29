import {afterEach, expect, test, vi} from 'vitest';
import * as path from 'path';

import {Buildx} from '@docker/actions-toolkit/lib/buildx/buildx.js';

import {getAuthList, getInputs} from '../src/context.js';

afterEach(() => {
  vi.restoreAllMocks();
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

test('getAuthList supports @ scopes appended to the registry config dir', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  process.env['INPUT_SCOPE'] = '@push';
  process.env['INPUT_LOGOUT'] = 'false';
  const [auth] = getAuthList(getInputs());
  expect(auth).toMatchObject({
    configDir: path.join(Buildx.configDir, 'config', 'registry-1.docker.io') + '@push'
  });
});

test('getAuthList supports repository scopes with appended actions', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  process.env['INPUT_SCOPE'] = 'docker/buildx-bin@push';
  process.env['INPUT_LOGOUT'] = 'false';
  const [auth] = getAuthList(getInputs());
  expect(auth).toMatchObject({
    configDir: path.join(Buildx.configDir, 'config', 'registry-1.docker.io', 'docker', 'buildx-bin@push')
  });
});

test('getAuthList supports comma-separated scope actions', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  process.env['INPUT_SCOPE'] = 'docker/buildx-bin@pull,push';
  process.env['INPUT_LOGOUT'] = 'false';
  const [auth] = getAuthList(getInputs());
  expect(auth).toMatchObject({
    configDir: path.join(Buildx.configDir, 'config', 'registry-1.docker.io', 'docker', 'buildx-bin@pull,push')
  });
});

// prettier-ignore
test.each([
  '../../../../work/leaked',
  '..',
  'foo/../../../../etc',
  '@../../../leaked',
  'foo/bar@../../../leaked',
  '@push@pull',
  'foo/bar@push@pull',
  '@push,',
  '@,push',
  '@pull,,push',
  '@Push',
  path.join(path.parse(Buildx.configDir).root, 'work', 'leaked')
])('getAuthList rejects unsafe or unsupported scope path: %s', async scope => {
  expect(() => {
    getAuthList({
      registry: '',
      username: 'dbowie',
      password: 'groundcontrol',
      scope,
      ecr: '',
      logout: false,
      registryAuth: ''
    });
  }).toThrow(/Invalid scope/);
});

// prettier-ignore
test.each([
  '../../../../work/leaked',
  '..',
  'foo/../../../../etc',
  path.join(path.parse(Buildx.configDir).root, 'work', 'leaked')
])('getAuthList rejects unsafe registry path: %s', async registry => {
  expect(() => {
    getAuthList({
      registry,
      username: 'dbowie',
      password: 'groundcontrol',
      scope: '@push',
      ecr: '',
      logout: false,
      registryAuth: ''
    });
  }).toThrow(/Invalid registry/);
});

test('getAuthList skips secret masking when registry-auth password is absent', async () => {
  const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const [auth] = getAuthList({
    registry: '',
    username: '',
    password: '',
    scope: '',
    ecr: '',
    logout: true,
    registryAuth: '- registry: public.ecr.aws\n'
  });

  expect(stdoutWriteSpy.mock.calls.map(call => call[0]).join('')).not.toContain('::add-mask::');
  expect(auth).toMatchObject({
    registry: 'public.ecr.aws',
    ecr: 'auto'
  });
});

test('getAuthList supports password-less Docker Hub registry-auth for OIDC', async () => {
  const [auth] = getAuthList({
    registry: '',
    username: '',
    password: '',
    scope: '',
    ecr: '',
    logout: true,
    registryAuth: '- username: docker-org\n'
  });

  expect(auth).toMatchObject({
    registry: 'docker.io',
    username: 'docker-org',
    password: undefined,
    ecr: 'auto'
  });
});

test('getAuthList masks registry-auth password when present', async () => {
  const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  getAuthList({
    registry: '',
    username: '',
    password: '',
    scope: '',
    ecr: '',
    logout: true,
    registryAuth: '- registry: ghcr.io\n  username: dbowie\n  password: groundcontrol\n'
  });

  expect(stdoutWriteSpy.mock.calls.map(call => call[0]).join('')).toContain('::add-mask::groundcontrol');
});
