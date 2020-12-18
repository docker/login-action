import * as semver from 'semver';
import * as aws from '../src/aws';

describe('isECR', () => {
  test.each([
    ['registry.gitlab.com', false],
    ['gcr.io', false],
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', true],
    ['876820548815.dkr.ecr.cn-north-1.amazonaws.com.cn', true],
    ['390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn', true],
    ['public.ecr.aws', true]
  ])('given registry %p', async (registry, expected) => {
    expect(await aws.isECR(registry)).toEqual(expected);
  });
});

describe('isPubECR', () => {
  test.each([
    ['registry.gitlab.com', false],
    ['gcr.io', false],
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', false],
    ['876820548815.dkr.ecr.cn-north-1.amazonaws.com.cn', false],
    ['390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn', false],
    ['public.ecr.aws', true]
  ])('given registry %p', async (registry, expected) => {
    expect(await aws.isPubECR(registry)).toEqual(expected);
  });
});

describe('getCLI', () => {
  it('exists', async () => {
    const awsPath = await aws.getCLI();
    console.log(`awsPath: ${awsPath}`);
    expect(awsPath).not.toEqual('');
  });
});

describe('execCLI', () => {
  it('--version not empty', async () => {
    const cliCmdOutput = await aws.execCLI(['--version']);
    console.log(`cliCmdOutput: ${cliCmdOutput}`);
    expect(cliCmdOutput).not.toEqual('');
  }, 100000);
});

describe('getCLIVersion', () => {
  it('valid', async () => {
    const cliVersion = await aws.getCLIVersion();
    console.log(`cliVersion: ${cliVersion}`);
    expect(semver.valid(cliVersion)).not.toBeNull();
  }, 100000);
});

describe('parseCLIVersion', () => {
  test.each([
    ['v1', 'aws-cli/1.18.120 Python/2.7.17 Linux/5.3.0-1034-azure botocore/1.17.43', '1.18.120'],
    ['v2', 'aws-cli/2.0.41 Python/3.7.3 Linux/4.19.104-microsoft-standard exe/x86_64.ubuntu.18', '2.0.41']
  ])('given aws %p', async (version, stdout, expected) => {
    expect(await aws.parseCLIVersion(stdout)).toEqual(expected);
  });
});

describe('getRegion', () => {
  test.each([
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', 'eu-west-3'],
    ['876820548815.dkr.ecr.cn-north-1.amazonaws.com.cn', 'cn-north-1'],
    ['390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn', 'cn-northwest-1'],
    ['public.ecr.aws', 'us-east-1']
  ])('given registry %p', async (registry, expected) => {
    expect(await aws.getRegion(registry)).toEqual(expected);
  });
});

describe('getAccountIDs', () => {
  test.each([
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', undefined, ['012345678901']],
    [
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
      '012345678910,023456789012',
      ['012345678901', '012345678910', '023456789012']
    ],
    [
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
      '012345678901,012345678910,023456789012',
      ['012345678901', '012345678910', '023456789012']
    ],
    [
      '390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn',
      '012345678910,023456789012',
      ['390948362332', '012345678910', '023456789012']
    ],
    ['public.ecr.aws', undefined, []]
  ])('given registry %p', async (registry, accountIDsEnv, expected) => {
    if (accountIDsEnv) {
      process.env.AWS_ACCOUNT_IDS = accountIDsEnv;
    }
    expect(await aws.getAccountIDs(registry)).toEqual(expected);
  });
});
