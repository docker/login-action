import * as core from '@actions/core';

export interface Inputs {
  registry: string;
  username: string;
  password: string;
  ecr: string;
  logout: boolean;
  httpCodesToRetry: string[];
  maxAttempts: number;
  retryTimeout: number;
}

export function getInputs(): Inputs {
  return {
    registry: core.getInput('registry'),
    username: core.getInput('username'),
    password: core.getInput('password'),
    ecr: core.getInput('ecr'),
    logout: core.getBooleanInput('logout'),
    httpCodesToRetry: core.getInput('http-codes-to-retry').split(','),
    maxAttempts: Number.parseInt(core.getInput('max-attempts')),
    retryTimeout: Number.parseInt(core.getInput('retry-timeout'))
  };
}
