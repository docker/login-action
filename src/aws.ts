import * as core from '@actions/core';
import {ECR} from '@aws-sdk/client-ecr';
import {ECRPUBLIC} from '@aws-sdk/client-ecr-public';
import {NodeHttpHandler} from '@smithy/node-http-handler';
import {HttpProxyAgent} from 'http-proxy-agent';
import {HttpsProxyAgent} from 'https-proxy-agent';

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
  const accountIDs: Array<string> = [matches[2]];
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

  let httpProxyAgent;
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY || '';
  if (httpProxy) {
    core.debug(`Using http proxy ${httpProxy}`);
    httpProxyAgent = new HttpProxyAgent(httpProxy);
  }

  let httpsProxyAgent;
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY || '';
  if (httpsProxy) {
    core.debug(`Using https proxy ${httpsProxy}`);
    httpsProxyAgent = new HttpsProxyAgent(httpsProxy);
  }

  const credentials =
    username && password
      ? {
          accessKeyId: username,
          secretAccessKey: password
        }
      : undefined;

  if (isPubECR(registry)) {
    core.info(`AWS Public ECR detected with ${region} region`);
    const ecrPublic = new ECRPUBLIC({
      customUserAgent: 'docker-login-action',
      credentials,
      region: region,
      requestHandler: new NodeHttpHandler({
        httpAgent: httpProxyAgent,
        httpsAgent: httpsProxyAgent
      })
    });
    const authTokenResponse = await ecrPublic.getAuthorizationToken(authTokenRequest);
    if (!authTokenResponse.authorizationData || !authTokenResponse.authorizationData.authorizationToken) {
      throw new Error('Could not retrieve an authorization token from AWS Public ECR');
    }
    const authToken = Buffer.from(authTokenResponse.authorizationData.authorizationToken, 'base64').toString('utf-8');
    const creds = authToken.split(':', 2);
    core.setSecret(creds[0]); // redacted in workflow logs
    core.setSecret(creds[1]); // redacted in workflow logs
    return [
      {
        registry: 'public.ecr.aws',
        username: creds[0],
        password: creds[1]
      }
    ];
  } else {
    core.info(`AWS ECR detected with ${region} region`);
    const ecr = new ECR({
      customUserAgent: 'docker-login-action',
      credentials,
      region: region,
      requestHandler: new NodeHttpHandler({
        httpAgent: httpProxyAgent,
        httpsAgent: httpsProxyAgent
      })
    });
    const authTokenResponse = await ecr.getAuthorizationToken(authTokenRequest);
    if (!Array.isArray(authTokenResponse.authorizationData) || !authTokenResponse.authorizationData.length) {
      throw new Error('Could not retrieve an authorization token from AWS ECR');
    }
    const regDatas: RegistryData[] = [];
    for (const authData of authTokenResponse.authorizationData) {
      const authToken = Buffer.from(authData.authorizationToken || '', 'base64').toString('utf-8');
      const creds = authToken.split(':', 2);
      core.setSecret(creds[0]); // redacted in workflow logs
      core.setSecret(creds[1]); // redacted in workflow logs
      regDatas.push({
        registry: authData.proxyEndpoint || '',
        username: creds[0],
        password: creds[1]
      });
    }
    return regDatas;
  }
};
