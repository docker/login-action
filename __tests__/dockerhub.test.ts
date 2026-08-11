import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import {beforeEach, describe, expect, test, vi} from 'vitest';

import * as dockerhub from '../src/dockerhub.js';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  getIDToken: vi.fn(),
  info: vi.fn(),
  setSecret: vi.fn()
}));

const validConnectionID = '123e4567-e89b-42d3-a456-426614174000';

const httpResponse = (statusCode: number, body: string, headers: Record<string, string> = {}): httpm.HttpClientResponse => {
  return {
    message: {
      statusCode,
      headers
    },
    readBody: vi.fn(async () => body)
  } as unknown as httpm.HttpClientResponse;
};

describe('isDockerHubOIDC', () => {
  beforeEach(() => {
    delete process.env.DOCKERHUB_OIDC_CONNECTIONID;
  });

  test.each(['', 'docker.io', 'registry-1.docker.io', 'registry-1-stage.docker.io'])('detects Docker Hub registry %p with empty password', registry => {
    process.env.DOCKERHUB_OIDC_CONNECTIONID = validConnectionID;
    expect(dockerhub.isDockerHubOIDC(registry, '')).toBe(true);
  });

  test('requires connection ID env var', () => {
    expect(dockerhub.isDockerHubOIDC('docker.io', '')).toBe(false);
  });

  test('requires empty password', () => {
    process.env.DOCKERHUB_OIDC_CONNECTIONID = validConnectionID;
    expect(dockerhub.isDockerHubOIDC('docker.io', 'groundcontrol')).toBe(false);
  });

  test('ignores non-Docker Hub registries', () => {
    process.env.DOCKERHUB_OIDC_CONNECTIONID = validConnectionID;
    expect(dockerhub.isDockerHubOIDC('ghcr.io', '')).toBe(false);
  });
});

describe('getOIDCToken', () => {
  const getIDTokenMock = vi.mocked(core.getIDToken);
  const setSecretMock = vi.mocked(core.setSecret);
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.DOCKERHUB_OIDC_CONNECTIONID = validConnectionID;
    delete process.env.DOCKERHUB_OIDC_EXPIREIN;
    getIDTokenMock.mockResolvedValue('github-id-token');
    postSpy = vi.spyOn(httpm.HttpClient.prototype, 'post').mockResolvedValue(httpResponse(200, JSON.stringify({access_token: 'hub-token'})));
  });

  test('exchanges GitHub OIDC token for Docker Hub token', async () => {
    const credentials = await dockerhub.getOIDCToken('docker.io', 'dbowie');

    expect(credentials).toEqual({
      username: 'dbowie',
      token: 'hub-token'
    });
    expect(getIDTokenMock).toHaveBeenCalledWith('https://identity.docker.com');
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe('https://identity.docker.com/oauth/token');

    const http = postSpy.mock.contexts[0] as httpm.HttpClient;
    expect(http.userAgent).toBe('github.com/docker/login-action');
    expect(http.requestOptions?.headers).toEqual({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    const body = new URLSearchParams(postSpy.mock.calls[0][1]);
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:token-exchange');
    expect(body.get('subject_token_type')).toBe('urn:ietf:params:oauth:token-type:id_token');
    expect(body.get('subject_token')).toBe('github-id-token');
    expect(body.get('connection_id')).toBe(validConnectionID);
    expect(body.get('expires_in')).toBe('300');
    expect(setSecretMock).toHaveBeenCalledWith('hub-token');
    expect(core.info).toHaveBeenCalledWith('Docker Hub OIDC detected for docker.io');
    expect(core.info).toHaveBeenCalledWith('Retrieving GitHub OIDC token for Docker Hub');
    expect(core.info).toHaveBeenCalledWith('Exchanging GitHub OIDC token for Docker Hub token');
    expect(core.info).toHaveBeenCalledWith('Docker Hub OIDC token exchange succeeded');
    expect(core.debug).toHaveBeenCalledWith('Docker Hub OIDC token audience: https://identity.docker.com');
    expect(core.debug).toHaveBeenCalledWith('Docker Hub OIDC token expiration: 300s');
    expect(core.debug).toHaveBeenCalledWith('Sending Docker Hub OIDC token request to https://identity.docker.com/oauth/token');
    expect(core.debug).toHaveBeenCalledWith('Docker Hub OIDC token request returned status code 200');
    expect(core.debug).toHaveBeenCalledWith('Docker Hub OIDC token response status code: 200');
  });

  test('uses custom token expiration', async () => {
    process.env.DOCKERHUB_OIDC_EXPIREIN = '21600';
    await dockerhub.getOIDCToken('docker.io', 'dbowie');
    const body = new URLSearchParams(postSpy.mock.calls[0][1]);
    expect(body.get('expires_in')).toBe('21600');
  });

  test('uses stage identity host for stage registry', async () => {
    await dockerhub.getOIDCToken('registry-1-stage.docker.io', 'dbowie');
    expect(getIDTokenMock).toHaveBeenCalledWith('https://identity-stage.docker.com');
    expect(postSpy.mock.calls[0][0]).toBe('https://identity-stage.docker.com/oauth/token');
  });

  test('requires connection ID env var', async () => {
    delete process.env.DOCKERHUB_OIDC_CONNECTIONID;
    await expect(dockerhub.getOIDCToken('docker.io', 'dbowie')).rejects.toThrow('DOCKERHUB_OIDC_CONNECTIONID is required for Docker Hub OIDC login');
    expect(getIDTokenMock).not.toHaveBeenCalled();
    expect(postSpy).not.toHaveBeenCalled();
  });

  test('validates connection ID', async () => {
    process.env.DOCKERHUB_OIDC_CONNECTIONID = 'not-a-uuid';
    await expect(dockerhub.getOIDCToken('docker.io', 'dbowie')).rejects.toThrow('Invalid DOCKERHUB_OIDC_CONNECTIONID. Must be a valid UUID.');
    expect(getIDTokenMock).not.toHaveBeenCalled();
    expect(postSpy).not.toHaveBeenCalled();
  });

  test.each(['not-a-number', '299', '21601'])('validates token expiration %p', async expiresIn => {
    process.env.DOCKERHUB_OIDC_EXPIREIN = expiresIn;
    await expect(dockerhub.getOIDCToken('docker.io', 'dbowie')).rejects.toThrow(`Invalid DOCKERHUB_OIDC_EXPIREIN: ${expiresIn}. Must be between 300 and 21600`);
    expect(getIDTokenMock).not.toHaveBeenCalled();
    expect(postSpy).not.toHaveBeenCalled();
  });

  test('retries rate limited token requests with Retry-After', async () => {
    postSpy.mockResolvedValueOnce(httpResponse(429, '', {'retry-after': '0'})).mockResolvedValueOnce(httpResponse(200, JSON.stringify({access_token: 'hub-token'})));
    await dockerhub.getOIDCToken('docker.io', 'dbowie');
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(core.info).toHaveBeenCalledWith('Docker Hub OIDC token request rate limited, retrying in 0ms (attempt 1/5)');
  });

  test('throws Docker Hub OIDC error responses', async () => {
    postSpy.mockResolvedValue(httpResponse(400, JSON.stringify({error: 'invalid_request', error_description: 'bad connection', error_uri: 'https://docs.docker.com'})));
    await expect(dockerhub.getOIDCToken('docker.io', 'dbowie')).rejects.toThrow('Docker Hub API: bad status code 400: {"error":"invalid_request","error_description":"bad connection","error_uri":"https://docs.docker.com"}');
  });

  test('throws rate limited Docker Hub OIDC error response after retries', async () => {
    postSpy.mockResolvedValue(httpResponse(429, JSON.stringify({error: 'rate_limited', error_description: 'slow down'}), {'retry-after': '0'}));
    await expect(dockerhub.getOIDCToken('docker.io', 'dbowie')).rejects.toThrow('Docker Hub API: bad status code 429: {"error":"rate_limited","error_description":"slow down"}');
    expect(postSpy).toHaveBeenCalledTimes(6);
  });
});
