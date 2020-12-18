import * as semver from 'semver';
import * as io from '@actions/io';
import * as execm from './exec';

const ecrRegistryRegex = /^(([0-9]{12})\.dkr\.ecr\.(.+)\.amazonaws\.com(.cn)?)(\/([^:]+)(:.+)?)?$/;

export const isECR = (registry: string): boolean => {
  return ecrRegistryRegex.test(registry) || isPubECR(registry);
};

export const isPubECR = (registry: string): boolean => {
  return registry === 'public.ecr.aws';
};

export const getRegion = (registry: string): string => {
  if (isPubECR(registry)) {
    return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  }
  const matches = registry.match(ecrRegistryRegex);
  if (!matches) {
    return '';
  }
  return matches[3];
};

export const getAccountIDs = (registry: string): string[] => {
  if (isPubECR(registry)) {
    return [];
  }
  const matches = registry.match(ecrRegistryRegex);
  if (!matches) {
    return [];
  }
  let accountIDs: Array<string> = [matches[2]];
  if (process.env.AWS_ACCOUNT_IDS) {
    accountIDs.push(...process.env.AWS_ACCOUNT_IDS.split(','));
  }
  return accountIDs.filter((item, index) => accountIDs.indexOf(item) === index);
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

export const getDockerLoginCmds = async (
  cliVersion: string,
  registry: string,
  region: string,
  accountIDs: string[]
): Promise<string[]> => {
  let ecrCmd = (await isPubECR(registry)) ? 'ecr-public' : 'ecr';
  if (semver.satisfies(cliVersion, '>=2.0.0') || (await isPubECR(registry))) {
    return execCLI([ecrCmd, 'get-login-password', '--region', region]).then(pwd => {
      return [`docker login --username AWS --password ${pwd} ${registry}`];
    });
  } else {
    return execCLI([
      ecrCmd,
      'get-login',
      '--region',
      region,
      '--registry-ids',
      accountIDs.join(' '),
      '--no-include-email'
    ]).then(dockerLoginCmds => {
      return dockerLoginCmds.trim().split(`\n`);
    });
  }
};
