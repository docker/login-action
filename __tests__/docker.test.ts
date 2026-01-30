import {expect, jest, test} from '@jest/globals';
import * as path from 'path';

import {loginStandard, logout} from '../src/docker';
import {RetryArgs} from '../src/context';

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

test('loginStandard retries on failure', async () => {
  jest.useFakeTimers();
  let attemptCount = 0;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    attemptCount++;
    if (attemptCount < 3) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'Error: timeout exceeded'
      };
    }
    return {
      exitCode: 0,
      stdout: 'Login Succeeded',
      stderr: ''
    };
  });

  const username = 'dbowie';
  const password = 'groundcontrol';
  const registry = 'https://ghcr.io';
  const retryArgs: RetryArgs = {attempts: 3, delayMs: 100};

  const loginPromise = loginStandard(registry, username, password, undefined, retryArgs);
  await jest.runAllTimersAsync();
  await loginPromise;

  expect(execSpy).toHaveBeenCalledTimes(3);
  expect(attemptCount).toBe(3);

  jest.useRealTimers();
});

test('loginStandard does not retry when attempts is 0', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Error: timeout exceeded'
    };
  });

  const username = 'dbowie';
  const password = 'groundcontrol';
  const registry = 'https://ghcr.io';
  const retryArgs: RetryArgs = {attempts: 0, delayMs: 100};

  await expect(loginStandard(registry, username, password, undefined, retryArgs)).rejects.toThrow('timeout exceeded');

  expect(execSpy).toHaveBeenCalledTimes(1);
});

test('loginStandard fails after max retries', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Error: timeout exceeded'
    };
  });

  const username = 'dbowie';
  const password = 'groundcontrol';
  const registry = 'https://ghcr.io';
  const retryArgs: RetryArgs = {attempts: 2, delayMs: 10};

  await expect(loginStandard(registry, username, password, undefined, retryArgs)).rejects.toThrow('timeout exceeded');

  expect(execSpy).toHaveBeenCalledTimes(3);
});

test('loginStandard does not retry on 5xx errors', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Docker, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Error: 500 Internal Server Error'
    };
  });

  const username = 'dbowie';
  const password = 'groundcontrol';
  const registry = 'https://ghcr.io';
  const retryArgs: RetryArgs = {attempts: 3, delayMs: 100};

  await expect(loginStandard(registry, username, password, undefined, retryArgs)).rejects.toThrow('500 Internal Server Error');

  expect(execSpy).toHaveBeenCalledTimes(1);
});
