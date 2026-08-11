import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import {HttpCodes} from '@actions/http-client';
import {validate as uuidValidate} from 'uuid';

export interface LoginCredentials {
  username: string;
  token: string;
}

interface OIDCTokenResponse {
  access_token: string;
}

const registries = new Set(['', 'docker.io', 'registry-1.docker.io', 'registry-1-stage.docker.io', 'dhi.io']);
const defaultExpiresIn = 300;
const minExpiresIn = 300;
const maxExpiresIn = 21600;
const maxRetries = 5;

export const isDockerHubOIDC = (registry: string, password: string): boolean => {
  return process.env.DOCKERHUB_OIDC_CONNECTIONID !== undefined && !password && registries.has(registry);
};

export const getOIDCToken = async (registry: string, username: string): Promise<LoginCredentials> => {
  const connectionID = process.env.DOCKERHUB_OIDC_CONNECTIONID?.trim();
  if (!connectionID) {
    throw new Error('DOCKERHUB_OIDC_CONNECTIONID is required for Docker Hub OIDC login');
  }

  if (!uuidValidate(connectionID)) {
    throw new Error('Invalid DOCKERHUB_OIDC_CONNECTIONID. Must be a valid UUID.');
  }

  const expiresIn = getExpiresIn();
  const identityHost = registry === 'registry-1-stage.docker.io' ? 'identity-stage.docker.com' : 'identity.docker.com';
  const audience = `https://${identityHost}`;
  core.info(`Docker Hub OIDC detected for ${registry || 'docker.io'}`);
  core.debug(`Docker Hub OIDC token audience: ${audience}`);
  core.debug(`Docker Hub OIDC token expiration: ${expiresIn}s`);
  core.info(`Retrieving GitHub OIDC token for Docker Hub`);
  const idToken = await core.getIDToken(audience);
  const http: httpm.HttpClient = new httpm.HttpClient('github.com/docker/login-action', [], {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const data = new URLSearchParams();
  data.set('grant_type', 'urn:ietf:params:oauth:grant-type:token-exchange');
  data.set('subject_token_type', 'urn:ietf:params:oauth:token-type:id_token');
  data.set('subject_token', idToken);
  data.set('connection_id', connectionID);
  data.set('expires_in', expiresIn.toString());

  core.info(`Exchanging GitHub OIDC token for Docker Hub token`);
  const resp = await postWithRetry(http, `https://${identityHost}/oauth/token`, data.toString());

  const tokenResp = <OIDCTokenResponse>JSON.parse(await handleResponse(resp));
  core.setSecret(tokenResp.access_token);
  core.info(`Docker Hub OIDC token exchange succeeded`);

  return {
    username,
    token: tokenResp.access_token
  };
};

const getExpiresIn = (): number => {
  const expiresInInput = process.env.DOCKERHUB_OIDC_EXPIREIN?.trim() || defaultExpiresIn.toString();
  const expiresIn = Number(expiresInInput);
  if (isNaN(expiresIn) || expiresIn < minExpiresIn || expiresIn > maxExpiresIn) {
    throw new Error(`Invalid DOCKERHUB_OIDC_EXPIREIN: ${expiresInInput}. Must be between ${minExpiresIn} and ${maxExpiresIn}`);
  }
  return expiresIn;
};

const postWithRetry = async (http: httpm.HttpClient, url: string, data: string): Promise<httpm.HttpClientResponse> => {
  core.debug(`Sending Docker Hub OIDC token request to ${url}`);
  let resp = await http.post(url, data);
  core.debug(`Docker Hub OIDC token request returned status code ${resp.message.statusCode || HttpCodes.InternalServerError}`);
  for (let attempt = 0; (resp.message.statusCode || HttpCodes.InternalServerError) === HttpCodes.TooManyRequests && attempt < maxRetries; attempt++) {
    const delay = parseRetryAfter(resp.message.headers['retry-after']);
    if (delay === null) {
      core.debug(`Docker Hub OIDC token request rate limited without retry-after header`);
      break;
    }
    await resp.readBody();
    core.info(`Docker Hub OIDC token request rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    resp = await http.post(url, data);
    core.debug(`Docker Hub OIDC token request returned status code ${resp.message.statusCode || HttpCodes.InternalServerError}`);
  }
  return resp;
};

const parseRetryAfter = (value: string | string[] | undefined): number | null => {
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    value = value[0];
  }
  const seconds = Number(value);
  if (isNaN(seconds)) {
    return null;
  }
  return Math.max(0, seconds * 1000);
};

const handleResponse = async (resp: httpm.HttpClientResponse): Promise<string> => {
  const body = await resp.readBody();
  const statusCode = resp.message.statusCode || HttpCodes.InternalServerError;
  core.debug(`Docker Hub OIDC token response status code: ${statusCode}`);
  if (statusCode < HttpCodes.OK || statusCode >= HttpCodes.MultipleChoices) {
    throw parseError(statusCode, body);
  }
  return body;
};

const parseError = (statusCode: number, body: string): Error => {
  if (body) {
    let errResp: unknown;
    try {
      errResp = JSON.parse(body);
    } catch {
      errResp = undefined;
    }
    if (errResp !== undefined) {
      throw new Error(`Docker Hub API: bad status code ${statusCode}: ${JSON.stringify(errResp)}`);
    }
  }
  if (statusCode === 401) {
    throw new Error(`Docker Hub API: operation not permitted`);
  }
  throw new Error(`Docker Hub API: bad status code ${statusCode}`);
};
