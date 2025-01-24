import {expect, jest, test} from '@jest/globals';

import {login} from '../src/docker';
import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

test('login retries function', async () => {
  let stderrStrings: string[] = [];
  let callCount: number = -1;

  // using spyOn() here isn't enough, as we alter the logic
  // so use `jest.fn()` here for the `Docker.getExecOutput`
  Docker.getExecOutput = jest.fn(async () => {
    callCount++;
    console.log(`Mock: ${callCount}, ${stderrStrings}`);
    if (callCount >= stderrStrings.length) {
      return {
        exitCode: 0,
        stdout: 'Mock success',
        stderr: ''
      };
    }
    return {
      exitCode: 1,
      stdout: '',
      stderr: stderrStrings[callCount % stderrStrings.length]
    };
  });

  const username = 'dbowie';
  const password = 'groundcontrol';
  const registry = 'https://ghcr.io';

  stderrStrings = ['mock error, failed with status: 408 Request Timeout', 'mock error, failed with status: 502 Request Timeout', 'mock error, failed with status: 400 Request Timeout'];
  callCount = -1;
  await expect(async () => {
    await login(registry, username, password, 'false', ['408', '400'], 5, 0.1);
  }).rejects.toThrow('mock error, failed with status: 502 Request Timeout');
  expect(Docker.getExecOutput).toHaveBeenCalledTimes(2);

  stderrStrings = ['not matching error', 'mock error, failed with status: 502 Request Timeout', 'mock error, failed with status: 400 Request Timeout'];
  callCount = -1;
  await expect(async () => {
    await login(registry, username, password, 'false', ['408', '400'], 5, 0.1);
  }).rejects.toThrow('not matching error');
  expect(Docker.getExecOutput).toHaveBeenCalledTimes(2 + 1);
});
