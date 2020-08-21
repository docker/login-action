import * as semver from 'semver';
import * as aws from '../src/aws';

describe('isECR', () => {
  test.each([
    ['registry.gitlab.com', false],
    ['gcr.io', false],
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', true]
  ])('given registry %p', async (registry, expected) => {
    expect(await aws.isECR(registry)).toEqual(expected);
  });
});

describe('getCLI', () => {
  it('exists', async () => {
    const awsPath = await aws.getCLI();
    console.log(`awsPath: ${awsPath}`);
    expect(awsPath).not.toEqual('');
  });
});

describe('getCLICmdOutput', () => {
  it('--version not empty', async () => {
    const cliCmdOutput = await aws.getCLICmdOutput(['--version']);
    console.log(`cliCmdOutput: ${cliCmdOutput}`);
    expect(cliCmdOutput).not.toEqual('');
  });
});

describe('getCLIVersion', () => {
  it('valid', async () => {
    const cliVersion = await aws.getCLIVersion();
    console.log(`cliVersion: ${cliVersion}`);
    expect(semver.valid(cliVersion)).not.toBeNull();
  });
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
  test.each([['012345678901.dkr.ecr.eu-west-3.amazonaws.com', 'eu-west-3']])(
    'given registry %p',
    async (registry, expected) => {
      expect(await aws.getRegion(registry)).toEqual(expected);
    }
  );
});
