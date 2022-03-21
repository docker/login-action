import * as core from '@actions/core';
import * as context from './context';
import * as docker from './docker';
import * as stateHelper from './state-helper';

export async function run(): Promise<void> {
  try {
    const input: context.Inputs = context.getInputs();
    stateHelper.setRegistry(input.registry);
    stateHelper.setLogout(input.logout);
    await docker.login(input.registry, input.username, input.password, input.ecr);
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
