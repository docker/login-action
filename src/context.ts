import * as core from '@actions/core';

export interface Inputs {
  registry: string;
  isECR: string;
  username: string;
  password: string;
  logout: string;
}

export function getInputs(): Inputs {
  return {
    registry: core.getInput('registry'),
    isECR: core.getInput('isECR'),
    username: core.getInput('username'),
    password: core.getInput('password'),
    logout: core.getInput('logout')
  };
}
