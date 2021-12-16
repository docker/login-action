import {loginECR, loginStandard, logout} from '../src/docker';
import * as aws from '../src/aws';

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

test('loginECR sets AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY if username and password is set', async () => {
  const execSpy: jest.SpyInstance = jest.spyOn(aws, 'getDockerLoginCmds');
  execSpy.mockImplementation(() => Promise.resolve([]));
  jest.spyOn(aws, 'getCLI').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getCLIVersion').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getRegion').mockImplementation(() => '');
  jest.spyOn(aws, 'getAccountIDs').mockImplementation(() => []);
  jest.spyOn(aws, 'isPubECR').mockImplementation(() => false);

  const username: string = 'dbowie';
  const password: string = 'groundcontrol';
  const registry: string = 'https://ghcr.io';

  await loginECR(registry, username, password);

  expect(process.env.AWS_ACCESS_KEY_ID).toEqual(username);
  expect(process.env.AWS_SECRET_ACCESS_KEY).toEqual(password);
});

test('loginECR keeps AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY if set', async () => {
  const execSpy: jest.SpyInstance = jest.spyOn(aws, 'getDockerLoginCmds');
  execSpy.mockImplementation(() => Promise.resolve([]));
  jest.spyOn(aws, 'getCLI').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getCLIVersion').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getRegion').mockImplementation(() => '');
  jest.spyOn(aws, 'getAccountIDs').mockImplementation(() => []);
  jest.spyOn(aws, 'isPubECR').mockImplementation(() => false);

  process.env.AWS_ACCESS_KEY_ID = 'banana';
  process.env.AWS_SECRET_ACCESS_KEY = 'supersecret';

  await loginECR('ecr.aws', '', '');

  expect(process.env.AWS_ACCESS_KEY_ID).toEqual('banana');
  expect(process.env.AWS_SECRET_ACCESS_KEY).toEqual('supersecret');
});

test('loginECR overrides AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY if username and password set', async () => {
  const execSpy: jest.SpyInstance = jest.spyOn(aws, 'getDockerLoginCmds');
  execSpy.mockImplementation(() => Promise.resolve([]));
  jest.spyOn(aws, 'getCLI').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getCLIVersion').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getRegion').mockImplementation(() => '');
  jest.spyOn(aws, 'getAccountIDs').mockImplementation(() => []);
  jest.spyOn(aws, 'isPubECR').mockImplementation(() => false);

  process.env.AWS_ACCESS_KEY_ID = 'banana';
  process.env.AWS_SECRET_ACCESS_KEY = 'supersecret';
  const username = 'myotheruser';
  const password = 'providedpassword';

  await loginECR('ecr.aws', username, password);

  expect(process.env.AWS_ACCESS_KEY_ID).toEqual(username);
  expect(process.env.AWS_SECRET_ACCESS_KEY).toEqual(password);
});

test('loginECR does not set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY if not set', async () => {
  const execSpy: jest.SpyInstance = jest.spyOn(aws, 'getDockerLoginCmds');
  execSpy.mockImplementation(() => Promise.resolve([]));
  jest.spyOn(aws, 'getCLI').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getCLIVersion').mockImplementation(() => Promise.resolve(''));
  jest.spyOn(aws, 'getRegion').mockImplementation(() => '');
  jest.spyOn(aws, 'getAccountIDs').mockImplementation(() => []);
  jest.spyOn(aws, 'isPubECR').mockImplementation(() => false);

  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;

  await loginECR('ecr.aws', '', '');

  expect('AWS_ACCESS_KEY_ID' in process.env).toEqual(false);
  expect('AWS_SECRET_ACCESS_KEY' in process.env).toEqual(false);
});
