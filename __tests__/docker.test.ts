import {afterEach, beforeEach, expect, test, vi} from 'vitest';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker.js';

import {loginStandard, logout} from '../src/docker.js';

beforeEach(() => {
  delete process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS;
});

afterEach(() => {
  delete process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS;
});

test('loginStandard calls exec', async () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput').mockResolvedValue({
    exitCode: 0,
    stdout: '',
    stderr: ''
  });

  const username = 'dbowie';
  const password = 'groundcontrol';
  const registry = 'ghcr.io';

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

test('loginStandard throws if username and password are missing', () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput');
  const login = loginStandard('ghcr.io', '', '');
  expect(execSpy).not.toHaveBeenCalled();
  return expect(login).rejects.toThrow('Username and password required');
});

test('loginStandard throws if username is missing', () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput');
  const login = loginStandard('ghcr.io', '', 'groundcontrol');
  expect(execSpy).not.toHaveBeenCalled();
  return expect(login).rejects.toThrow('Username required');
});

test('loginStandard throws if password is missing', () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput');
  const login = loginStandard('ghcr.io', 'dbowie', '');
  expect(execSpy).not.toHaveBeenCalled();
  return expect(login).rejects.toThrow('Password required');
});

test('loginStandard skips if both credentials are missing and env opt-in is enabled', () => {
  process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS = 'true';
  const execSpy = vi.spyOn(Docker, 'getExecOutput');
  const login = loginStandard('ghcr.io', '', '');
  expect(execSpy).not.toHaveBeenCalled();
  return expect(login).resolves.toBeUndefined();
});

test('loginStandard skips if username is missing and env opt-in is enabled', () => {
  process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS = 'true';
  const execSpy = vi.spyOn(Docker, 'getExecOutput');
  const login = loginStandard('ghcr.io', '', 'groundcontrol');
  expect(execSpy).not.toHaveBeenCalled();
  return expect(login).resolves.toBeUndefined();
});

test('loginStandard skips if password is missing and env opt-in is enabled', () => {
  process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS = 'true';
  const execSpy = vi.spyOn(Docker, 'getExecOutput');
  const login = loginStandard('ghcr.io', 'dbowie', '');
  expect(execSpy).not.toHaveBeenCalled();
  return expect(login).resolves.toBeUndefined();
});

test('logout calls exec', async () => {
  const execSpy = vi.spyOn(Docker, 'getExecOutput').mockResolvedValue({
    exitCode: 0,
    stdout: '',
    stderr: ''
  });

  const registry = 'ghcr.io';
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
