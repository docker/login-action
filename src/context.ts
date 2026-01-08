import path from 'path';
import * as core from '@actions/core';
import * as yaml from 'js-yaml';

import {Buildx} from '@docker/actions-toolkit/lib/buildx/buildx';
import {Util} from '@docker/actions-toolkit/lib/util';

export interface Inputs {
  registry: string;
  username: string;
  password: string;
  scope: string;
  ecr: string;
  logout: boolean;
  registryAuth: string;
}

export interface Auth {
  registry: string;
  username: string;
  password: string;
  scope: string;
  ecr: string;
  configDir: string;
}

export function getInputs(): Inputs {
  return {
    registry: core.getInput('registry'),
    username: core.getInput('username'),
    password: core.getInput('password'),
    scope: core.getInput('scope'),
    ecr: core.getInput('ecr'),
    logout: core.getBooleanInput('logout'),
    registryAuth: core.getInput('registry-auth')
  };
}

export function getAuthList(inputs: Inputs): Array<Auth> {
  if (inputs.registryAuth && (inputs.registry || inputs.username || inputs.password || inputs.scope || inputs.ecr)) {
    throw new Error('Cannot use registry-auth with other inputs');
  }
  let auths: Array<Auth> = [];
  if (!inputs.registryAuth) {
    auths.push({
      registry: inputs.registry || 'docker.io',
      username: inputs.username,
      password: inputs.password,
      scope: inputs.scope,
      ecr: inputs.ecr || 'auto',
      configDir: scopeToConfigDir(inputs.registry, inputs.scope)
    });
  } else {
    auths = (yaml.load(inputs.registryAuth) as Array<Auth>).map(auth => {
      core.setSecret(auth.password); // redacted in workflow logs
      return {
        registry: auth.registry || 'docker.io',
        username: auth.username,
        password: auth.password,
        scope: auth.scope,
        ecr: auth.ecr || 'auto',
        configDir: scopeToConfigDir(auth.registry || 'docker.io', auth.scope)
      };
    });
  }
  if (auths.length == 0) {
    throw new Error('No registry to login');
  }
  return auths;
}

export function scopeToConfigDir(registry: string, scope?: string): string {
  if (scopeDisabled() || !scope || scope === '') {
    return '';
  }
  let configDir = path.join(Buildx.configDir, 'config', registry === 'docker.io' ? 'registry-1.docker.io' : registry);
  if (scope.startsWith('@')) {
    configDir += scope;
  } else {
    configDir = path.join(configDir, scope);
  }
  return configDir;
}

function scopeDisabled(): boolean {
  if (process.env.DOCKER_LOGIN_SCOPE_DISABLED) {
    return Util.parseBool(process.env.DOCKER_LOGIN_SCOPE_DISABLED);
  }
  return false;
}
