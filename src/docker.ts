import * as aws from './aws';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

export async function login(registry: string, username: string, password: string): Promise<void> {
  if (await aws.isECR(registry)) {
    await loginECR(registry, username, password);
  } else {
    await loginStandard(registry, username, password);
  }
}

export async function logout(registry: string): Promise<void> {
  await exec
    .getExecOutput('docker', ['logout', registry], {
      ignoreReturnCode: true
    })
    .then(res => {
      if (res.stderr.length > 0 && res.exitCode != 0) {
        core.warning(res.stderr.trim());
      }
    });
}

export async function loginStandard(registry: string, username: string, password: string): Promise<void> {
  if (!username || !password) {
    throw new Error('Username and password required');
  }

  let loginArgs: Array<string> = ['login', '--password-stdin'];
  loginArgs.push('--username', username);
  loginArgs.push(registry);

  if (registry) {
    core.info(`Logging into ${registry}...`);
  } else {
    core.info(`Logging into Docker Hub...`);
  }
  await exec
    .getExecOutput('docker', loginArgs, {
      ignoreReturnCode: true,
      silent: true,
      input: Buffer.from(password)
    })
    .then(res => {
      if (res.stderr.length > 0) {
        if (res.exitCode != 0) {
          throw new Error(res.stderr.trim());
        } else {
          core.warning(res.stderr);
        }
      }
      core.info(`Login Succeeded!`);
    });
}

export async function loginECR(registry: string, username: string, password: string): Promise<void> {
  const cliPath = await aws.getCLI();
  const cliVersion = await aws.getCLIVersion();
  const region = await aws.getRegion(registry);
  const accountIDs = await aws.getAccountIDs(registry);

  if (await aws.isPubECR(registry)) {
    core.info(`AWS Public ECR detected with ${region} region`);
  } else {
    core.info(`AWS ECR detected with ${region} region`);
  }

  process.env.AWS_ACCESS_KEY_ID = username || process.env.AWS_ACCESS_KEY_ID;
  process.env.AWS_SECRET_ACCESS_KEY = password || process.env.AWS_SECRET_ACCESS_KEY;

  core.info(`Retrieving docker login command through AWS CLI ${cliVersion} (${cliPath})...`);
  const loginCmds = await aws.getDockerLoginCmds(cliVersion, registry, region, accountIDs);

  core.info(`Logging into ${registry}...`);
  loginCmds.forEach((loginCmd, index) => {
    exec
      .getExecOutput(loginCmd, [], {
        ignoreReturnCode: true,
        silent: true
      })
      .then(res => {
        if (res.stderr.length > 0 && res.exitCode != 0) {
          throw new Error(res.stderr.trim());
        }
        if (loginCmds.length > 1) {
          core.info(`Login Succeeded! (${index}/${loginCmds.length})`);
        } else {
          core.info('Login Succeeded!');
        }
      });
  });
}
