import osm = require('os');

import {run} from '../src/main';
import * as docker from '../src/docker';
import * as stateHelper from '../src/state-helper';

import * as core from '@actions/core';

test('errors without username and password', async () => {
  const platSpy = jest.spyOn(osm, 'platform');
  platSpy.mockImplementation(() => 'linux');

  process.env['INPUT_LOGOUT'] = 'true'; // default value

  const coreSpy: jest.SpyInstance = jest.spyOn(core, 'setFailed');

  await run();

  expect(coreSpy).toHaveBeenCalledWith('Username and password required');
});

test('successful with username and password', async () => {
  const platSpy = jest.spyOn(osm, 'platform');
  platSpy.mockImplementation(() => 'linux');

  const setRegistrySpy: jest.SpyInstance = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy: jest.SpyInstance = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy: jest.SpyInstance = jest.spyOn(docker, 'login');
  dockerSpy.mockImplementation(() => {});

  const username: string = 'dbowie';
  process.env[`INPUT_USERNAME`] = username;

  const password: string = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  const logout: boolean = false;
  process.env['INPUT_LOGOUT'] = String(logout);

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith('');
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith('', username, password);
});

test('calls docker login', async () => {
  const platSpy = jest.spyOn(osm, 'platform');
  platSpy.mockImplementation(() => 'linux');

  const setRegistrySpy: jest.SpyInstance = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy: jest.SpyInstance = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy: jest.SpyInstance = jest.spyOn(docker, 'login');
  dockerSpy.mockImplementation(() => {});

  const username: string = 'dbowie';
  process.env[`INPUT_USERNAME`] = username;

  const password: string = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  const registry: string = 'ghcr.io';
  process.env[`INPUT_REGISTRY`] = registry;

  const logout: boolean = true;
  process.env['INPUT_LOGOUT'] = String(logout);

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith(registry);
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith(registry, username, password);
});
