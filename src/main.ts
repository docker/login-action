import * as os from 'os';
import * as core from '@actions/core';
import {getInputs, Inputs} from './context';
import * as docker from './docker';
import * as stateHelper from './state-helper';

export async function run(): Promise<void> {
  try {
    if (os.platform() !== 'linux') {
      throw new Error('Only supported on linux platform');
    }

    const {registry, isECR, username, password, logout} = getInputs();
    stateHelper.setRegistry(registry);
    stateHelper.setLogout(logout);
    await docker.login(registry, username, password, isECR);
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function logout(): Promise<void> {
  if (!stateHelper.logout) {
    return;
  }
  await docker.logout(stateHelper.registry);
}

if (!stateHelper.IsPost) {
  run();
} else {
  logout();
}
