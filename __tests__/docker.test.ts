import {expect, jest, test} from '@jest/globals';
import * as path from 'path';

import {loginStandard, logout} from '../src/docker';
import {Exec} from '@docker/actions-toolkit/lib/exec';

process.env['RUNNER_TEMP'] = path.join(__dirname, 'runner');

test('loginStandard calls exec', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Exec, 'getExecOutput').mockImplementation(async () => {
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

  expect(execSpy).toHaveBeenCalledWith(`docker`, ['login', '--password-stdin', '--username', username, registry], {
    input: Buffer.from(password),
    silent: true,
    ignoreReturnCode: true
  });
});

test('logout calls exec', async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const execSpy = jest.spyOn(Exec, 'getExecOutput').mockImplementation(async () => {
    return {
      exitCode: expect.any(Number),
      stdout: expect.any(Function),
      stderr: expect.any(Function)
    };
  });

  const registry = 'https://ghcr.io';

  await logout(registry);

  expect(execSpy).toHaveBeenCalledWith(`docker`, ['logout', registry], {
    ignoreReturnCode: true
  });
});
