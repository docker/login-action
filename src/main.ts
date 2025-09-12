import * as yaml from 'js-yaml';
import * as core from '@actions/core';
import * as actionsToolkit from '@docker/actions-toolkit';

import * as context from './context';
import * as docker from './docker';
import * as stateHelper from './state-helper';

interface Auth {
  registry: string;
  username: string;
  password: string;
  ecr: string;
}

export async function main(): Promise<void> {
  const inputs: context.Inputs = context.getInputs();
  stateHelper.setLogout(inputs.logout);

  if (inputs.registryAuth && (inputs.registry || inputs.username || inputs.password || inputs.ecr)) {
    throw new Error('Cannot use registry-auth with other inputs');
  }

  if (!inputs.registryAuth) {
    stateHelper.setRegistries([inputs.registry || 'docker.io']);
    await docker.login(inputs.registry || 'docker.io', inputs.username, inputs.password, inputs.ecr || 'auto');
    return;
  }

  const auths = yaml.load(inputs.registryAuth) as Auth[];
  if (auths.length == 0) {
    throw new Error('No registry to login');
  }

  const registries: string[] = [];
  for (const auth of auths) {
    if (!auth.registry) {
      registries.push('docker.io');
    } else {
      registries.push(auth.registry);
    }
  }
  stateHelper.setRegistries(registries.filter((value, index, self) => self.indexOf(value) === index));

  for (const auth of auths) {
    await core.group(`Login to ${auth.registry || 'docker.io'}`, async () => {
      await docker.login(auth.registry || 'docker.io', auth.username, auth.password, auth.ecr || 'auto');
    });
  }
}

async function post(): Promise<void> {
  if (!stateHelper.logout) {
    return;
  }
  for (const registry of stateHelper.registries.split(',')) {
    await docker.logout(registry);
  }
}

actionsToolkit.run(main, post);
