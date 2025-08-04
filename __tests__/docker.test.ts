import {expect, jest, test} from '@jest/globals';
import * as path from 'path';

import {loginStandard, logout} from '../src/docker';

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
  // Define const registry as multiline input
  const registry = `https://ghcr.io
https://docker.io`;

  const registryArray = registry.split('\n').map(r => r.trim());

  for (const reg of registryArray) {
    await loginStandard(reg, username, password);
  }

  expect(execSpy).toHaveBeenCalledTimes(2);
  const firstcall = execSpy.mock.calls[0];
  if (firstcall && firstcall[1]) {
    // we don't want to check env opt
    firstcall[1].env = undefined;
  }
  expect(execSpy).toHaveBeenCalledWith(['login', '--password-stdin', '--username', username, registryArray[0]], {
    input: Buffer.from(password),
    silent: true,
    ignoreReturnCode: true
  });

  const secondcall = execSpy.mock.calls[1];
  if (secondcall && secondcall[1]) {
    // we don't want to check env opt
    secondcall[1].env = undefined;
  }
  expect(execSpy).toHaveBeenCalledWith(['login', '--password-stdin', '--username', username, registryArray[1]], {
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

  const registry = `https://ghcr.io
https://docker.io`;

  const registryArray = registry.split('\n').map(r => r.trim());

  for (const reg of registryArray) {
    await logout(reg);
  }

  expect(execSpy).toHaveBeenCalledTimes(2);
  const firstcall = execSpy.mock.calls[0];
  if (firstcall && firstcall[1]) {
    // we don't want to check env opt
    firstcall[1].env = undefined;
  }
  expect(execSpy).toHaveBeenCalledWith(['logout', registryArray[0]], {
    ignoreReturnCode: true
  });

  const secondcall = execSpy.mock.calls[1];
  if (secondcall && secondcall[1]) {
    // we don't want to check env opt
    secondcall[1].env = undefined;
  }

  expect(execSpy).toHaveBeenCalledWith(['logout', registryArray[1]], {
    ignoreReturnCode: true
  });
});
