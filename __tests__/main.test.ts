import osm = require('os');

import {run} from '../src/main';
import * as docker from '../src/docker';
import * as stateHelper from '../src/state-helper';

import * as core from '@actions/core';

test('errors when not run on linux platform', async () => {
  const platSpy = jest.spyOn(osm, 'platform');
  platSpy.mockImplementation(() => 'netbsd');

  const coreSpy: jest.SpyInstance = jest.spyOn(core, 'setFailed');

  await run();

  expect(coreSpy).toHaveBeenCalledWith('Only supported on linux platform');
});

test('errors without password', async () => {
  const platSpy = jest.spyOn(osm, 'platform');
  platSpy.mockImplementation(() => 'linux');

  const coreSpy: jest.SpyInstance = jest.spyOn(core, 'setFailed');

  await run();

  expect(coreSpy).toHaveBeenCalledWith('Input required and not supplied: password');
});

test('successful with only password', async () => {
  const platSpy = jest.spyOn(osm, 'platform');
  platSpy.mockImplementation(() => 'linux');

  const setRegistrySpy: jest.SpyInstance = jest.spyOn(stateHelper, 'setRegistry');
  const setLogoutSpy: jest.SpyInstance = jest.spyOn(stateHelper, 'setLogout');
  const dockerSpy: jest.SpyInstance = jest.spyOn(docker, 'login');
  dockerSpy.mockImplementation(() => {});

  const password: string = 'groundcontrol';
  process.env[`INPUT_PASSWORD`] = password;

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith('');
  expect(setLogoutSpy).toHaveBeenCalledWith('');
  expect(dockerSpy).toHaveBeenCalledWith('', '', password);
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

  const registry: string = 'https://ghcr.io';
  process.env[`INPUT_REGISTRY`] = registry;

  const logout: string = 'true';
  process.env['INPUT_LOGOUT'] = logout;

  await run();

  expect(setRegistrySpy).toHaveBeenCalledWith(registry);
  expect(setLogoutSpy).toHaveBeenCalledWith(logout);
  expect(dockerSpy).toHaveBeenCalledWith(registry, username, password);
});
