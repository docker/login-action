import * as aws from './aws';
import * as core from '@actions/core';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

export async function login(registry: string, username: string, password: string, ecr: string, http_codes_to_retry: string[], max_attempts: number, retry_timeout: number): Promise<void> {
  let succeeded: boolean = false;
  for (let attempt = 1; attempt <= max_attempts && !succeeded; attempt++) {
    try {
      if (/true/i.test(ecr) || (ecr == 'auto' && aws.isECR(registry))) {
        await loginECR(registry, username, password);
      } else {
        await loginStandard(registry, username, password);
      }
      succeeded = true;
    } catch (error) {
      if (attempt < max_attempts && isRetriableError(error.message, http_codes_to_retry)) {
        core.info(`Attempt ${attempt} out of ${max_attempts} failed, retrying after ${retry_timeout} seconds`);
        await new Promise(r => setTimeout(r, retry_timeout * 1000));
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

function isRetriableError(error_message: string, http_codes_to_retry: string[]): boolean {
  for (const err_code of http_codes_to_retry) {
    if (error_message.includes('failed with status: ' + err_code)) {
      return true;
    }
  }
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
