import * as core from '@actions/core';

import * as aws from './aws';
import * as context from './context';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

export async function login(auth: context.Auth): Promise<void> {
  if (/true/i.test(auth.ecr) || (auth.ecr == 'auto' && aws.isECR(auth.registry))) {
    await loginECR(auth.registry, auth.username, auth.password, auth.scope);
  } else {
    await loginStandard(auth.registry, auth.username, auth.password, auth.scope);
  }
}

export async function logout(registry: string, configDir: string): Promise<void> {
  let envs: {[key: string]: string} | undefined;
  if (configDir !== '') {
    envs = Object.assign({}, process.env, {
      DOCKER_CONFIG: configDir
    }) as {
      [key: string]: string;
    };
    core.info(`Alternative config dir: ${configDir}`);
  }
  await Docker.getExecOutput(['logout', registry], {
    ignoreReturnCode: true,
    env: envs
  }).then(res => {
    if (res.stderr.length > 0 && res.exitCode != 0) {
      core.warning(res.stderr.trim());
    }
  });
}

export async function loginStandard(registry: string, username: string, password: string, scope?: string): Promise<void> {
  if (!username && !password) {
    throw new Error('Username and password required');
  }
  if (!username) {
    throw new Error('Username required');
  }
  if (!password) {
    throw new Error('Password required');
  }
  await loginExec(registry, username, password, scope);
}

export async function loginECR(registry: string, username: string, password: string, scope?: string): Promise<void> {
  core.info(`Retrieving registries data through AWS SDK...`);
  const regDatas = await aws.getRegistriesData(registry, username, password);
  for (const regData of regDatas) {
    await loginExec(regData.registry, regData.username, regData.password, scope);
  }
}

async function loginExec(registry: string, username: string, password: string, scope?: string): Promise<void> {
  let envs: {[key: string]: string} | undefined;
  const configDir = context.scopeToConfigDir(registry, scope);
  if (configDir !== '') {
    envs = Object.assign({}, process.env, {
      DOCKER_CONFIG: configDir
    }) as {
      [key: string]: string;
    };
    core.info(`Logging into ${registry} (scope ${scope})...`);
  } else {
    core.info(`Logging into ${registry}...`);
  }
  await Docker.getExecOutput(['login', '--password-stdin', '--username', username, registry], {
    ignoreReturnCode: true,
    silent: true,
    input: Buffer.from(password),
    env: envs
  }).then(res => {
    if (res.stderr.length > 0 && res.exitCode != 0) {
      throw new Error(res.stderr.trim());
    }
    core.info('Login Succeeded!');
  });
}
