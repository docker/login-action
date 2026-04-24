import {beforeEach, describe, expect, test, vi} from 'vitest';

import * as chainguard from '../src/chainguard.js';

describe('isChainguard', () => {
  test.each([
    ['cgr.dev', true],
    ['registry.gitlab.com', false],
    ['gcr.io', false],
    ['docker.io', false],
    ['ghcr.io', false],
    ['public.ecr.aws', false],
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', false],
    ['not-cgr.dev', false],
    ['cgr.dev.example.com', false]
  ])('given registry %p returns %p', (registry, expected) => {
    expect(chainguard.isChainguard(registry)).toEqual(expected);
  });
});

const mockGetIDToken = vi.fn();
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  setSecret: vi.fn(),
  getIDToken: (...args: unknown[]) => mockGetIDToken(...args)
}));

const mockGetJson = vi.fn();
vi.mock('@actions/http-client', () => {
  return {
    HttpClient: class {
      getJson = mockGetJson;
    }
  };
});

describe('getRegistryToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('exchanges OIDC token for Chainguard token', async () => {
    const fakeOIDCToken = 'oidc-token-123';
    const fakeChainguardToken = 'chainguard-token-456';
    const identity = 'abc123/def456';

    mockGetIDToken.mockResolvedValue(fakeOIDCToken);
    mockGetJson.mockResolvedValue({
      statusCode: 200,
      result: {token: fakeChainguardToken}
    });

    const result = await chainguard.getRegistryToken(identity);

    expect(mockGetIDToken).toHaveBeenCalledWith('cgr.dev');
    expect(mockGetJson).toHaveBeenCalledWith(`https://issuer.enforce.dev/sts/exchange?aud=cgr.dev&identity=${encodeURIComponent(identity)}`, {Authorization: `Bearer ${fakeOIDCToken}`});
    expect(result).toEqual({
      username: 'user',
      password: fakeChainguardToken
    });
  });

  test('uses custom issuer URL when provided', async () => {
    const fakeOIDCToken = 'oidc-token-123';
    const fakeChainguardToken = 'chainguard-token-456';
    const identity = 'abc123/def456';
    const customIssuer = 'https://custom-issuer.example.dev';

    mockGetIDToken.mockResolvedValue(fakeOIDCToken);
    mockGetJson.mockResolvedValue({
      statusCode: 200,
      result: {token: fakeChainguardToken}
    });

    await chainguard.getRegistryToken(identity, customIssuer);

    expect(mockGetJson).toHaveBeenCalledWith(`${customIssuer}/sts/exchange?aud=cgr.dev&identity=${encodeURIComponent(identity)}`, {Authorization: `Bearer ${fakeOIDCToken}`});
  });

  test('throws on non-200 response', async () => {
    mockGetIDToken.mockResolvedValue('oidc-token');
    mockGetJson.mockResolvedValue({
      statusCode: 401,
      result: null
    });

    await expect(chainguard.getRegistryToken('identity-id')).rejects.toThrow('Failed to exchange OIDC token with Chainguard (HTTP 401)');
  });

  test('throws when response has no token', async () => {
    mockGetIDToken.mockResolvedValue('oidc-token');
    mockGetJson.mockResolvedValue({
      statusCode: 200,
      result: {}
    });

    await expect(chainguard.getRegistryToken('identity-id')).rejects.toThrow('Failed to exchange OIDC token with Chainguard (HTTP 200)');
  });
});
