import * as core from '@actions/core';

export interface Inputs {
  registry: string;
  username: string;
  password: string;
  logout: string;
}

export function getInputs(): Inputs {
  return {
    registry: core.getInput('registry'),
    username: core.getInput('username'),
    password: core.getInput('password', {required: true}),
    logout: core.getInput('logout')
  };
}
