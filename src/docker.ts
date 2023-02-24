import * as aws from './aws';
import * as core from '@actions/core';
import {Exec} from '@docker/actions-toolkit/lib/exec';

export async function login(registry: string, username: string, password: string, ecr: string): Promise<void> {
  if (/true/i.test(ecr) || (ecr == 'auto' && aws.isECR(registry))) {
    await loginECR(registry, username, password);
  } else {
    await loginStandard(registry, username, password);
  }
}

export async function logout(registry: string): Promise<void> {
  await Exec.getExecOutput('docker', ['logout', registry], {
    ignoreReturnCode: true
  }).then(res => {
    if (res.stderr.length > 0 && res.exitCode != 0) {
      core.warning(res.stderr.trim());
    }
  });
}

export async function loginStandard(registry: string, username: string, password: string): Promise<void> {
  if (!username || !password) {
    throw new Error('Username and password required');
  }

  const loginArgs: Array<string> = ['login', '--password-stdin'];
  loginArgs.push('--username', username);
  loginArgs.push(registry);

  if (registry) {
    core.info(`Logging into ${registry}...`);
  } else {
    core.info(`Logging into Docker Hub...`);
  }
  await Exec.getExecOutput('docker', loginArgs, {
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
    await Exec.getExecOutput('docker', ['login', '--password-stdin', '--username', regData.username, regData.registry], {
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
