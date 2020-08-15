import * as os from 'os';
import * as core from '@actions/core';
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

    let loginArgs: Array<string> = ['login', '--password', password];
    if (username) {
      loginArgs.push('--username', username);
    }
    loginArgs.push(registry);

    await exec.exec('docker', loginArgs, true).then(res => {
      if (res.stderr != '' && !res.success) {
        throw new Error(res.stderr);
      }
      core.info('🎉 Login Succeeded!');
    });
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
