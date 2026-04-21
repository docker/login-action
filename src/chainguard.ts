import * as core from '@actions/core';
import * as http from '@actions/http-client';

const chainguardRegistryRegex = /^cgr\.dev$/;

const DEFAULT_ISSUER = 'https://issuer.enforce.dev';
const DEFAULT_AUDIENCE = 'cgr.dev';

export const isChainguard = (registry: string): boolean => {
  return chainguardRegistryRegex.test(registry);
};

export interface ChainguardTokenResponse {
  token: string;
}

export const getRegistryToken = async (identity: string, issuerURL?: string): Promise<{username: string; password: string}> => {
  const issuer = issuerURL || DEFAULT_ISSUER;

  core.info('Requesting GitHub Actions OIDC token...');
  const oidcToken = await core.getIDToken(DEFAULT_AUDIENCE);

  core.info(`Exchanging OIDC token with Chainguard (${issuer})...`);
  const client = new http.HttpClient('docker-login-action');
  const url = `${issuer}/sts/exchange?aud=${encodeURIComponent(DEFAULT_AUDIENCE)}&identity=${encodeURIComponent(identity)}`;
  const response = await client.getJson<ChainguardTokenResponse>(url, {
    Authorization: `Bearer ${oidcToken}`
  });

  if (response.statusCode !== 200 || !response.result?.token) {
    throw new Error(`Failed to exchange OIDC token with Chainguard (HTTP ${response.statusCode})`);
  }

  const token = response.result.token;
  core.setSecret(token);

  return {
    username: 'user',
    password: token
  };
};
