import * as core from '@actions/core';
import * as context from './context';
import * as docker from './docker';
import * as stateHelper from './state-helper';

export async function run(): Promise<void> {
  try {
    const input: context.Inputs = context.getInputs();
    stateHelper.setRegistry(input.registry);
    stateHelper.setLogout(input.logout);
    let retryErrorPattern = input.retryErrorPattern;
    let attemptCount = parseInt(input.retries);
    if (isNaN(attemptCount)) attemptCount = 3;
    attemptCount = Math.min(attemptCount, 50);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await docker.login(input.registry, input.username, input.password, input.ecr);
        break;
      } catch (error: any) {
        if (!retryErrorPattern || !RegExp(retryErrorPattern).test(error.message) || --attemptCount <= 0) throw error;
        core.warning(`Error <<<${error.message}>>> is recoverable, retrying...`);
      }
    }
  } catch (error: any) {
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
