import {expect, test, vi} from 'vitest';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker.js';

import {loginStandard, logout} from '../src/docker.js';

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
