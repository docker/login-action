import * as core from '@actions/core';

export const registries = process.env['STATE_registries'] || '';
export const logout = /true/i.test(process.env['STATE_logout'] || '');

export function setRegistries(registries: string[]) {
  core.saveState('registries', registries.join(','));
}

export function setLogout(logout: boolean) {
  core.saveState('logout', logout);
}
