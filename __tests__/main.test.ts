import {expect, jest, test} from '@jest/globals';
import osm = require('os');

import {run} from '../src/main';
import * as docker from '../src/docker';
import * as stateHelper from '../src/state-helper';

import * as core from '@actions/core';

test('errors without username and password', async () => {
  jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  process.env['INPUT_LOGOUT'] = 'true'; // default value
  const coreSpy = jest.spyOn(core, 'setFailed');

  await run();
  expect(coreSpy).toHaveBeenCalledWith('Username and password required');
});

test('successful with username and password', async () => {
  jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  const setRegistrySpy = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy = jest.spyOn(docker, 'login').mockImplementation(jest.fn());

  const username = 'dbowie';
  process.env[`INPUT_USERNAME`] = username;

  const password = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  const ecr = 'auto';
  process.env['INPUT_ECR'] = ecr;

  const logout = false;
  process.env['INPUT_LOGOUT'] = String(logout);

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith('');
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith('', username, password, ecr);
});

test('calls docker login', async () => {
  jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  const setRegistrySpy = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy = jest.spyOn(docker, 'login');
  dockerSpy.mockImplementation(jest.fn());

  const username = 'dbowie';
  process.env[`INPUT_USERNAME`] = username;

  const password = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  const registry = 'ghcr.io';
  process.env[`INPUT_REGISTRY`] = registry;

  const ecr = 'auto';
  process.env['INPUT_ECR'] = ecr;

  const logout = true;
  process.env['INPUT_LOGOUT'] = String(logout);

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith(registry);
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith(registry, username, password, ecr);
});
