import * as core from '@actions/core';
import * as aws from './aws';
import * as execm from './exec';

export async function login(registry: string, username: string, password: string): Promise<void> {
  if (await aws.isECR(registry)) {
    await loginECR(registry, username, password);
  } else {
    await loginStandard(registry, username, password);
  }
}

export async function logout(registry: string): Promise<void> {
  await execm.exec('docker', ['logout', registry], false).then(res => {
    if (res.stderr != '' && !res.success) {
      core.warning(res.stderr);
    }
  });
}

export async function loginStandard(registry: string, username: string, password: string): Promise<void> {
  let loginArgs: Array<string> = ['login', '--password-stdin'];
  if (username) {
    loginArgs.push('--username', username);
  }
  loginArgs.push(registry);

  if (registry) {
    core.info(`🔑 Logging into ${registry}...`);
  } else {
    core.info(`🔑 Logging into DockerHub...`);
  }
  await execm.exec('docker', loginArgs, true, password).then(res => {
    if (res.stderr != '' && !res.success) {
      throw new Error(res.stderr);
    }
    core.info('🎉 Login Succeeded!');
  });
}

export async function loginECR(registry: string, username: string, password: string): Promise<void> {
  const cliPath = await aws.getCLI();
  const cliVersion = await aws.getCLIVersion();
  const region = await aws.getRegion(registry);
  core.info(`💡 AWS ECR detected with ${region} region`);

  process.env.AWS_ACCESS_KEY_ID = username;
  process.env.AWS_SECRET_ACCESS_KEY = password;

  core.info(`⬇️ Retrieving docker login command through AWS CLI ${cliVersion} (${cliPath})...`);
  const loginCmd = await aws.getDockerLoginCmd(cliVersion, registry, region);

  core.info(`🔑 Logging into ${registry}...`);
  execm.exec(loginCmd, [], true).then(res => {
    if (res.stderr != '' && !res.success) {
      throw new Error(res.stderr);
    }
    core.info('🎉 Login Succeeded!');
  });
}
