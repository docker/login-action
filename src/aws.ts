import * as semver from 'semver';
import * as io from '@actions/io';
import * as execm from './exec';

export const isECR = async (registry: string): Promise<boolean> => {
  return registry.includes('amazonaws');
};

export const getRegion = async (registry: string): Promise<string> => {
  return registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));
};

export const getCLI = async (): Promise<string> => {
  return io.which('aws', true);
};

export const execCLI = async (args: string[]): Promise<string> => {
  return execm.exec(await getCLI(), args, true).then(res => {
    if (res.stderr != '' && !res.success) {
      throw new Error(res.stderr);
    } else if (res.stderr != '') {
      return res.stderr.trim();
    } else {
      return res.stdout.trim();
    }
  });
};

export const getCLIVersion = async (): Promise<string> => {
  return parseCLIVersion(await execCLI(['--version']));
};

export const parseCLIVersion = async (stdout: string): Promise<string> => {
  const matches = /aws-cli\/([0-9.]+)/.exec(stdout);
  if (!matches) {
    throw new Error(`Cannot parse AWS CLI version`);
  }
  return semver.clean(matches[1]);
};

export const getDockerLoginCmd = async (cliVersion: string, registry: string, region: string): Promise<string> => {
  if (semver.satisfies(cliVersion, '>=2.0.0')) {
    return execCLI(['ecr', 'get-login-password', '--region', region]).then(pwd => {
      return `docker login --username AWS --password ${pwd} ${registry}`;
    });
  } else {
    return execCLI(['ecr', 'get-login', '--region', region, '--no-include-email']).then(dockerLoginCmd => {
      return dockerLoginCmd;
    });
  }
};
