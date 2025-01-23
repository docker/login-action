import * as core from '@actions/core';

export interface Inputs {
  registry: string;
  username: string;
  password: string;
  ecr: string;
  logout: boolean;
  http_errors_to_retry: string[];
  max_attempts: number;
  retry_timeout: number;
}

export function getInputs(): Inputs {
  return {
    registry: core.getInput('registry'),
    username: core.getInput('username'),
    password: core.getInput('password'),
    ecr: core.getInput('ecr'),
    logout: core.getBooleanInput('logout'),
    http_errors_to_retry: core.getInput('http_errors_to_retry').split(','),
    max_attempts: Number.parseInt(core.getInput('max_attempts')),
    retry_timeout: Number.parseInt(core.getInput('retry_timeout'))
  };
}
