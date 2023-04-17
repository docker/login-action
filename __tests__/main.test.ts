import {expect, jest, test} from '@jest/globals';
import osm = require('os');

import {main} from '../src/main';
import * as docker from '../src/docker';
import * as stateHelper from '../src/state-helper';

test('errors without username and password', async () => {
  jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  process.env['INPUT_LOGOUT'] = 'true'; // default value
  await expect(main()).rejects.toThrow(new Error('Username and password required'));
});

test('successful with username and password', async () => {
  jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  const setRegistrySpy = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy = jest.spyOn(docker, 'login').mockImplementation(() => Promise.resolve());

  const username = 'dbowie';
  process.env[`INPUT_USERNAME`] = username;

  const password = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  const ecr = 'auto';
  process.env['INPUT_ECR'] = ecr;

  const logout = false;
  process.env['INPUT_LOGOUT'] = String(logout);

  await main();

  expect(setRegistrySpy).toHaveBeenCalledWith('');
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith('', username, password, ecr);
});

test('calls docker login', async () => {
  jest.spyOn(osm, 'platform').mockImplementation(() => 'linux');
  const setRegistrySpy = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy = jest.spyOn(docker, 'login').mockImplementation(() => Promise.resolve());

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

  await main();

  expect(setRegistrySpy).toHaveBeenCalledWith(registry);
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith(registry, username, password, ecr);
});
