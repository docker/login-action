import {loginStandard, logout} from '../src/docker';

import * as path from 'path';

import * as exec from '@actions/exec';

process.env['RUNNER_TEMP'] = path.join(__dirname, 'runner');

test('loginStandard calls exec', async () => {
  const execSpy: jest.SpyInstance = jest.spyOn(exec, 'getExecOutput');
  execSpy.mockImplementation(() =>
    Promise.resolve({
      exitCode: expect.any(Number),
      stdout: expect.any(Function),
      stderr: expect.any(Function)
    })
  );

  const username: string = 'dbowie';
  const password: string = 'groundcontrol';
  const registry: string = 'https://ghcr.io';

  await loginStandard(registry, username, password);

  expect(execSpy).toHaveBeenCalledWith(`docker`, ['login', '--password-stdin', '--username', username, registry], {
    input: Buffer.from(password),
    silent: true,
    ignoreReturnCode: true
  });
});

test('logout calls exec', async () => {
  const execSpy: jest.SpyInstance = jest.spyOn(exec, 'getExecOutput');
  execSpy.mockImplementation(() =>
    Promise.resolve({
      exitCode: expect.any(Number),
      stdout: expect.any(Function),
      stderr: expect.any(Function)
    })
  );

  const registry: string = 'https://ghcr.io';

  await logout(registry);

  expect(execSpy).toHaveBeenCalledWith(`docker`, ['logout', registry], {
    ignoreReturnCode: true
  });
});
