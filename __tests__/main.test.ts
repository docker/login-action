import {expect, jest, test} from '@jest/globals';
import osm = require('os');

import {run} from '../src/main';
import * as docker from '../src/docker';
import * as stateHelper from '../src/state-helper';

import * as core from '@actions/core';

test('errors without username and password', async () => {
  const platSpy = jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');

  process.env['INPUT_LOGOUT'] = 'true'; // default value
  const coreSpy = jest.spyOn(core, 'setFailed');

  await run();
  expect(coreSpy).toHaveBeenCalledWith('Username and password required');
});

test('successful with username and password', async () => {
  const platSpy = jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  const setRegistrySpy = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy = jest.spyOn(docker, 'login').mockImplementation(jest.fn());

  const username: string = 'dbowie';
  process.env[`INPUT_USERNAME`] = username;

  const password: string = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  const ecr: string = 'auto';
  process.env['INPUT_ECR'] = ecr;

  const logout: boolean = false;
  process.env['INPUT_LOGOUT'] = String(logout);

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith('');
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith('', username, password, ecr);
});

test('calls docker login', async () => {
  const platSpy = jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  const setRegistrySpy = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy = jest.spyOn(docker, 'login');
  dockerSpy.mockImplementation(jest.fn());

  const username: string = 'dbowie';
  process.env[`INPUT_USERNAME`] = username;

  const password: string = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  const registry: string = 'ghcr.io';
  process.env[`INPUT_REGISTRY`] = registry;

  const ecr: string = 'auto';
  process.env['INPUT_ECR'] = ecr;

  const logout: boolean = true;
  process.env['INPUT_LOGOUT'] = String(logout);

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith(registry);
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith(registry, username, password, ecr);
});

test('retried error without username and password', async () => {
  const platSpy = jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');

  const setFailedSpy = jest.spyOn(core, 'setFailed');
  const warningSpy = jest.spyOn(core, 'warning');
  const dockerSpy = jest.spyOn(docker, 'login');
  dockerSpy.mockImplementation(() => {
    throw Error('Username and password required');
  });

  process.env['INPUT_LOGOUT'] = 'true'; // default value
  process.env['INPUT_RETRYERRORPATTERN'] = '.*and password.*';
  process.env['INPUT_RETRIES'] = '5';

  await run();
  expect(warningSpy).toHaveBeenCalledWith('Error <<<Username and password required>>> is recoverable, retrying...');
  expect(warningSpy).toBeCalledTimes(4);
  expect(setFailedSpy).toHaveBeenCalledWith('Username and password required');
});
