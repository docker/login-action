import * as core from '@actions/core';

export const registries = process.env['STATE_registries'] ? (JSON.parse(process.env['STATE_registries']) as Array<RegistryState>) : [];
export const logout = /true/i.test(process.env['STATE_logout'] || '');

export interface RegistryState {
  registry: string;
  configDir: string;
}

export function setRegistries(registries: Array<RegistryState>) {
  core.saveState('registries', JSON.stringify(registries));
}

export function setLogout(logout: boolean) {
  core.saveState('logout', logout);
}
