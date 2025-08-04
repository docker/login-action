import * as actionsToolkit from '@docker/actions-toolkit';

import * as context from './context';
import * as docker from './docker';
import * as stateHelper from './state-helper';

const input: context.Inputs = context.getInputs();

export async function main(): Promise<void> {
  stateHelper.setRegistry(input.registry);
  stateHelper.setLogout(input.logout);
  for (const reg of input.registry) {
    await docker.login(reg, input.username, input.password, input.ecr);
  }
}

async function post(): Promise<void> {
  if (!stateHelper.logout) {
    return;
  }
  for (const reg of input.registry) {
    await docker.logout(reg);
  }
}

actionsToolkit.run(main, post);
