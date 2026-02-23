import {afterEach, beforeEach, expect, jest, test} from '@jest/globals';
import * as path from 'path';

import {loginStandard, logout} from '../src/docker';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

process.env['RUNNER_TEMP'] = path.join(__dirname, 'runner');

beforeEach(() => {
  delete process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS;
});

afterEach(() => {
  delete process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS;
});

test('loginStandard calls exec', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: expect.any(Number),
      stdout: expect.any(Function),
      stderr: expect.any(Function)
    };
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

test('loginStandard throws if username and password are missing', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput');
  await expect(loginStandard('ghcr.io', '', '')).rejects.toThrow('Username and password required');
  expect(execSpy).not.toHaveBeenCalled();
});

test('loginStandard throws if username is missing', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput');
  await expect(loginStandard('ghcr.io', '', 'groundcontrol')).rejects.toThrow('Username required');
  expect(execSpy).not.toHaveBeenCalled();
});

test('loginStandard throws if password is missing', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput');
  await expect(loginStandard('ghcr.io', 'dbowie', '')).rejects.toThrow('Password required');
  expect(execSpy).not.toHaveBeenCalled();
});

test('loginStandard skips if both credentials are missing and env opt-in is enabled', async () => {
  process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS = 'true';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput');

  await expect(loginStandard('ghcr.io', '', '')).resolves.toBeUndefined();
  expect(execSpy).not.toHaveBeenCalled();
});

test('loginStandard skips if username is missing and env opt-in is enabled', async () => {
  process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS = 'true';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput');

  await expect(loginStandard('ghcr.io', '', 'groundcontrol')).resolves.toBeUndefined();
  expect(execSpy).not.toHaveBeenCalled();
});

test('loginStandard skips if password is missing and env opt-in is enabled', async () => {
  process.env.DOCKER_LOGIN_SKIP_IF_MISSING_CREDS = 'true';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput');

  await expect(loginStandard('ghcr.io', 'dbowie', '')).resolves.toBeUndefined();
  expect(execSpy).not.toHaveBeenCalled();
});

test('logout calls exec', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: expect.any(Number),
      stdout: expect.any(Function),
      stderr: expect.any(Function)
    };
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
