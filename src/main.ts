import * as core from '@actions/core';
import * as context from './context';
import * as docker from './docker';
import * as stateHelper from './state-helper';

export async function run(): Promise<void> {
  try {
    const {registry, username, password, logout} = context.getInputs();
    stateHelper.setRegistry(registry);
    stateHelper.setLogout(logout);
    await docker.login(registry, username, password);
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
