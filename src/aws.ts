import * as core from '@actions/core';
import * as aws from 'aws-sdk';

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

export interface RegistryData {
  registry: string;
  username: string;
  password: string;
}

export const getRegistriesData = async (registry: string, username?: string, password?: string): Promise<RegistryData[]> => {
  const region = getRegion(registry);
  const accountIDs = getAccountIDs(registry);

  const authTokenRequest = {};
  if (accountIDs.length > 0) {
    core.debug(`Requesting AWS ECR auth token for ${accountIDs.join(', ')}`);
    authTokenRequest['registryIds'] = accountIDs;
  }

  if (isPubECR(registry)) {
    core.info(`AWS Public ECR detected with ${region} region`);
    const ecrPublic = new aws.ECRPUBLIC({
      customUserAgent: 'docker-login-action',
      accessKeyId: username || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: password || process.env.AWS_SECRET_ACCESS_KEY || '',
      region: region
    });
    const authTokenResponse = await ecrPublic.getAuthorizationToken(authTokenRequest).promise();
    if (!authTokenResponse.authorizationData || !authTokenResponse.authorizationData.authorizationToken) {
      throw new Error('Could not retrieve an authorization token from AWS Public ECR');
    }
    const authToken = Buffer.from(authTokenResponse.authorizationData.authorizationToken, 'base64').toString('utf-8');
    const creds = authToken.split(':', 2);
    return [
      {
        registry: 'public.ecr.aws',
        username: creds[0],
        password: creds[1]
      }
    ];
  } else {
    core.info(`AWS ECR detected with ${region} region`);
    const ecr = new aws.ECR({
      customUserAgent: 'docker-login-action',
      accessKeyId: username || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: password || process.env.AWS_SECRET_ACCESS_KEY || '',
      region: region
    });
    const authTokenResponse = await ecr.getAuthorizationToken(authTokenRequest).promise();
    if (!Array.isArray(authTokenResponse.authorizationData) || !authTokenResponse.authorizationData.length) {
      throw new Error('Could not retrieve an authorization token from AWS ECR');
    }
    const regDatas: RegistryData[] = [];
    for (const authData of authTokenResponse.authorizationData) {
      const authToken = Buffer.from(authData.authorizationToken || '', 'base64').toString('utf-8');
      const creds = authToken.split(':', 2);
      regDatas.push({
        registry: authData.proxyEndpoint || '',
        username: creds[0],
        password: creds[1]
      });
    }
    return regDatas;
  }
};
