import * as core from '@actions/core';

export interface Inputs {
  registry: string;
  username: string;
  password: string;
  ecr: string;
  logout: boolean;
  retryErrorPattern: string;
  retries: string;
}

export function getInputs(): Inputs {
  return {
    registry: core.getInput('registry'),
    username: core.getInput('username'),
    password: core.getInput('password'),
    ecr: core.getInput('ecr'),
    logout: core.getBooleanInput('logout'),
    retryErrorPattern: core.getInput('retryErrorPattern'),
    retries: core.getInput('retries')
  };
}
