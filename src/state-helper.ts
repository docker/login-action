import * as core from '@actions/core';

export const registry = process.env['STATE_registry'] || '';
export const logout = /true/i.test(process.env['STATE_logout'] || '');

export function setRegistry(registry: string[]) {
  core.info(`Setting registry: ${registry.join(',')}`);
  core.saveState('registry', registry.join(','));
}

export function setLogout(logout: boolean) {
  core.saveState('logout', logout);
}
