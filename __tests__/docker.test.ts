import {afterEach, expect, test, vi} from 'vitest';
import * as path from 'path';

import {Buildx} from '@docker/actions-toolkit/lib/buildx/buildx.js';
import {Docker} from '@docker/actions-toolkit/lib/docker/docker.js';

import * as aws from '../src/aws.js';
import {getAuthList} from '../src/context.js';
import {login, loginECR, loginStandard, logout} from '../src/docker.js';
import * as dockerhub from '../src/dockerhub.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.DOCKERHUB_OIDC_CONNECTIONID;
});

test('loginStandard calls exec', async () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: expect.any(Number),
      stdout: expect.any(Function),
      stderr: expect.any(Function)
    };
  });

  const username = 'dbowie';
  const password = 'groundcontrol';
  const registry = 'https://ghcr.io';

  await loginStandard(registry, username, password);

  expect(execSpy).toHaveBeenCalledTimes(1);
  const callfunc = execSpy.mock.calls[0];
  if (callfunc && callfunc[1]) {
    // we don't want to check env opt
    callfunc[1].env = undefined;
  }
  expect(execSpy).toHaveBeenCalledWith(['login', '--password-stdin', '--username', username, registry], {
    input: Buffer.from(password),
    silent: true,
    ignoreReturnCode: true
  });
});

test('login exchanges Docker Hub OIDC token for password-less auth', async () => {
  process.env.DOCKERHUB_OIDC_CONNECTIONID = '123e4567-e89b-42d3-a456-426614174000';
  const execSpy = vi.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: 0,
      stdout: '',
      stderr: ''
    };
  });
  const oidcSpy = vi.spyOn(dockerhub, 'getOIDCToken').mockResolvedValue({
    username: 'docker-org',
    token: 'hub-token'
  });

  await login({
    registry: 'docker.io',
    username: 'docker-org',
    password: '',
    scope: '',
    ecr: 'auto',
    configDir: ''
  });

  expect(oidcSpy).toHaveBeenCalledWith('docker.io', 'docker-org');
  expect(execSpy).toHaveBeenCalledWith(['login', '--password-stdin', '--username', 'docker-org', 'docker.io'], {
    input: Buffer.from('hub-token'),
    silent: true,
    ignoreReturnCode: true
  });
});

test('logout calls exec', async () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: expect.any(Number),
      stdout: expect.any(Function),
      stderr: expect.any(Function)
    };
  });

  const registry = 'https://ghcr.io';

  await logout(registry, '');

  expect(execSpy).toHaveBeenCalledTimes(1);
  const callfunc = execSpy.mock.calls[0];
  if (callfunc && callfunc[1]) {
    // we don't want to check env opt
    callfunc[1].env = undefined;
  }
  expect(execSpy).toHaveBeenCalledWith(['logout', registry], {
    ignoreReturnCode: true
  });
});

test('loginECR writes scoped credentials to the config dir of the registry host', async () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput').mockResolvedValue({
    exitCode: 0,
    stdout: '',
    stderr: ''
  });
  // ECR returns the proxy endpoint as a URL, e.g. https://012345678910.dkr.ecr.eu-west-3.amazonaws.com
  vi.spyOn(aws, 'getRegistriesData').mockResolvedValue([
    {
      registry: 'https://012345678910.dkr.ecr.eu-west-3.amazonaws.com',
      username: 'AWS',
      password: 'world'
    }
  ]);

  const registry = '012345678910.dkr.ecr.eu-west-3.amazonaws.com';
  const scope = 'myapp@push';
  await loginECR(registry, 'CAFEBABE', 'DEADBEEF', scope);

  const expectedConfigDir = path.join(Buildx.configDir, 'config', registry, 'myapp') + '@push';
  expect(execSpy).toHaveBeenCalledTimes(1);
  expect(execSpy.mock.calls[0][1]?.env?.DOCKER_CONFIG).toBe(expectedConfigDir);

  // logout in the post step uses the config dir computed from the inputs
  const [auth] = getAuthList({registry, username: 'CAFEBABE', password: 'DEADBEEF', scope, ecr: 'auto', logout: true, registryAuth: ''});
  expect(auth.configDir).toBe(expectedConfigDir);
});
