import {expect, jest, test} from '@jest/globals';
import * as path from 'path';

import {loginStandard, logout} from '../src/docker';
import * as core from '@actions/core';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

process.env['RUNNER_TEMP'] = path.join(__dirname, 'runner');

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

test('loginStandard throws plain error on auth failure', async () => {
  jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Error response from daemon: unauthorized: incorrect username or password'
    };
  });

  await expect(loginStandard('https://ghcr.io', 'user', 'wrongpass')).rejects.toThrow(
    'Error response from daemon: unauthorized: incorrect username or password'
  );
});

test('loginStandard appends network hint on timeout error', async () => {
  jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Error response from daemon: Get "https://ghcr.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)'
    };
  });
  jest.spyOn(core, 'warning').mockImplementation(() => undefined);

  await expect(loginStandard('https://ghcr.io', 'user', 'pass')).rejects.toThrow(
    /context deadline exceeded[\s\S]*Hint: looks like a network connectivity issue/
  );
});

test('loginStandard appends network hint on dial tcp error', async () => {
  jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Error response from daemon: Get "https://ghcr.io/v2/": dial tcp 140.82.112.21:443: i/o timeout'
    };
  });
  jest.spyOn(core, 'warning').mockImplementation(() => undefined);

  await expect(loginStandard('https://ghcr.io', 'user', 'pass')).rejects.toThrow(
    /dial tcp[\s\S]*Hint: looks like a network connectivity issue/
  );
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
