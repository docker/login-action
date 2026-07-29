import path from 'path';
import * as core from '@actions/core';
import * as yaml from 'js-yaml';

import {Buildx} from '@docker/actions-toolkit/lib/buildx/buildx.js';
import {Util} from '@docker/actions-toolkit/lib/util.js';

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
    const registry = inputs.registry || 'docker.io';
    auths.push({
      registry,
      username: inputs.username,
      password: inputs.password,
      scope: inputs.scope,
      ecr: inputs.ecr || 'auto',
      configDir: scopeToConfigDir(registry, inputs.scope)
    });
  } else {
    auths = (yaml.load(inputs.registryAuth) as Array<Auth>).map(auth => {
      if (auth.password) {
        core.setSecret(auth.password); // redacted in workflow logs
      }
      const registry = auth.registry || 'docker.io';
      return {
        registry,
        username: auth.username,
        password: auth.password,
        scope: auth.scope,
        ecr: auth.ecr || 'auto',
        configDir: scopeToConfigDir(registry, auth.scope)
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
  const configRoot = path.resolve(Buildx.configDir, 'config');
  const registryDir = path.resolve(configRoot, registry === 'docker.io' ? 'registry-1.docker.io' : registry);
  if (!isChildPath(configRoot, registryDir)) {
    throw new Error(`Invalid registry '${registry}': resolved config path escapes the Buildx config directory`);
  }
  const scopeParts = scope.split('@');
  if (scopeParts.length > 2) {
    throw new Error(`Invalid scope '${scope}': scope can contain at most one @ separator`);
  }
  const [scopePath, scopeActions] = scopeParts;
  if (scopeActions !== undefined && !/^[a-z]+(,[a-z]+)*$/.test(scopeActions)) {
    throw new Error(`Invalid scope '${scope}': scope actions must be lowercase names separated by commas`);
  }
  const scopeSuffix = scopeActions === undefined ? '' : `@${scopeActions}`;
  if (scopePath === '') {
    return `${registryDir}${scopeSuffix}`;
  }
  const configDir = path.resolve(registryDir, scopePath);
  if (!isChildPath(registryDir, configDir)) {
    throw new Error(`Invalid scope '${scope}': resolved config path escapes the Buildx config directory`);
  }
  return `${configDir}${scopeSuffix}`;
}

function isChildPath(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);
  return relativePath !== '' && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

function scopeDisabled(): boolean {
  if (process.env.DOCKER_LOGIN_SCOPE_DISABLED) {
    return Util.parseBool(process.env.DOCKER_LOGIN_SCOPE_DISABLED);
  }
  return false;
}
