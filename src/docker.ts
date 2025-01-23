import * as aws from './aws';
import * as core from '@actions/core';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

export async function login(registry: string, username: string, password: string, ecr: string, httpCodesToRetry: string[], maxAttempts: number, retryTimeout: number): Promise<void> {
  let succeeded: boolean = false;
  for (let attempt = 1; attempt <= maxAttempts && !succeeded; attempt++) {
    try {
      if (/true/i.test(ecr) || (ecr == 'auto' && aws.isECR(registry))) {
        await loginECR(registry, username, password);
      } else {
        await loginStandard(registry, username, password);
      }
      succeeded = true;
    } catch (error) {
      if (attempt < maxAttempts && isRetriableError(error.message, httpCodesToRetry)) {
        core.info(`Attempt ${attempt} out of ${maxAttempts} failed, retrying after ${retryTimeout} seconds`);
        await new Promise(r => setTimeout(r, retryTimeout * 1000));
      } else {
        throw error;
      }
    }
  }
}

export async function logout(registry: string): Promise<void> {
  await Docker.getExecOutput(['logout', registry], {
    ignoreReturnCode: true
  }).then(res => {
    if (res.stderr.length > 0 && res.exitCode != 0) {
      core.warning(res.stderr.trim());
    }
  });
}

function isRetriableError(errorMessage: string, httpCodesToRetry: string[]): boolean {
  for (const errCode of httpCodesToRetry) {
    if (errorMessage.includes('failed with status: ' + errCode)) {
      core.info(`Retryable match found in ${errorMessage} for retryable code: ${errCode}`);
      return true;
    }
  }
  core.info(`No matches in ${errorMessage} when lookging for retryable codes: ${httpCodesToRetry}`);
  return false;
}

export async function loginStandard(registry: string, username: string, password: string): Promise<void> {
  if (!username && !password) {
    throw new Error('Username and password required');
  }
  if (!username) {
    throw new Error('Username required');
  }
  if (!password) {
    throw new Error('Password required');
  }

  const loginArgs: Array<string> = ['login', '--password-stdin'];
  loginArgs.push('--username', username);
  loginArgs.push(registry);

  if (registry) {
    core.info(`Logging into ${registry}...`);
  } else {
    core.info(`Logging into Docker Hub...`);
  }
  await Docker.getExecOutput(loginArgs, {
    ignoreReturnCode: true,
    silent: true,
    input: Buffer.from(password)
  }).then(res => {
    if (res.stderr.length > 0 && res.exitCode != 0) {
      throw new Error(res.stderr.trim());
    }
    core.info(`Login Succeeded!`);
  });
}

export async function loginECR(registry: string, username: string, password: string): Promise<void> {
  core.info(`Retrieving registries data through AWS SDK...`);
  const regDatas = await aws.getRegistriesData(registry, username, password);
  for (const regData of regDatas) {
    core.info(`Logging into ${regData.registry}...`);
    await Docker.getExecOutput(['login', '--password-stdin', '--username', regData.username, regData.registry], {
      ignoreReturnCode: true,
      silent: true,
      input: Buffer.from(regData.password)
    }).then(res => {
      if (res.stderr.length > 0 && res.exitCode != 0) {
        throw new Error(res.stderr.trim());
      }
      core.info('Login Succeeded!');
    });
  }
}
