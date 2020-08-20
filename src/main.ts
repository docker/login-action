import * as os from 'os';
import * as core from '@actions/core';
import * as ecr from './ecr';
import * as exec from './exec';
import * as stateHelper from './state-helper';

async function run(): Promise<void> {
  try {
    if (os.platform() !== 'linux') {
      core.setFailed('Only supported on linux platform');
      return;
    }

    const registry: string = core.getInput('registry');
    stateHelper.setRegistry(registry);
    stateHelper.setLogout(core.getInput('logout'));

    const username: string = core.getInput('username');
    const password: string = core.getInput('password', {required: true});

    if (await ecr.isECR(registry)) {
      await exec.exec('aws', ['--version'], true).then(res => {
        if (res.stderr != '' && !res.success) {
          throw new Error(res.stderr);
        }
        core.info(`💡 Using ${res.stdout}`);
      });

      const ecrRegion = await ecr.getRegion(registry);
      process.env.AWS_ACCESS_KEY_ID = username;
      process.env.AWS_SECRET_ACCESS_KEY = password;

      core.info(`🔑 Logging into AWS ECR region ${ecrRegion}...`);
      await exec.exec('aws', ['ecr', 'get-login', '--region', ecrRegion, '--no-include-email'], true).then(res => {
        if (res.stderr != '' && !res.success) {
          throw new Error(res.stderr);
        }
        core.info('🎉 Login Succeeded!');
      });
    } else {
      let loginArgs: Array<string> = ['login', '--password', password];
      if (username) {
        loginArgs.push('--username', username);
      }
      loginArgs.push(registry);

      if (registry) {
        core.info(`🔑 Logging into ${registry}...`);
      } else {
        core.info(`🔑 Logging into DockerHub...`);
      }
      await exec.exec('docker', loginArgs, true).then(res => {
        if (res.stderr != '' && !res.success) {
          throw new Error(res.stderr);
        }
        core.info('🎉 Login Succeeded!');
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function logout(): Promise<void> {
  if (!stateHelper.logout) {
    return;
  }
  await exec.exec('docker', ['logout', stateHelper.registry], false).then(res => {
    if (res.stderr != '' && !res.success) {
      core.warning(res.stderr);
    }
  });
}

if (!stateHelper.IsPost) {
  run();
} else {
  logout();
}
