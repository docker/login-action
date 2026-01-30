import * as core from '@actions/core';

import * as aws from './aws';
import * as context from './context';

import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: Error): boolean {
  const errorMsg = error.message.toLowerCase();
  const statusCode5xxPattern = /\b5\d{2}\b/;
  return !statusCode5xxPattern.test(errorMsg);
}

async function withRetry<T>(fn: () => Promise<T>, retryArgs: context.RetryArgs, context: string): Promise<T> {
  const maxAttempts = Math.max(1, retryArgs.attempts + 1);
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts || !isRetryableError(lastError)) {
        if (attempt > 1) {
          core.info(`${context}: Failed after ${attempt} attempts`);
        }
        throw lastError;
      }

      const delay = retryArgs.delayMs * Math.pow(2, attempt - 1);
      core.warning(`${context}: Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

export async function login(auth: context.Auth): Promise<void> {
  if (/true/i.test(auth.ecr) || (auth.ecr == 'auto' && aws.isECR(auth.registry))) {
    await loginECR(auth.registry, auth.username, auth.password, auth.scope, auth.retryArgs);
  } else {
    await loginStandard(auth.registry, auth.username, auth.password, auth.scope, auth.retryArgs);
  }
}

export async function logout(registry: string, configDir: string): Promise<void> {
  let envs: {[key: string]: string} | undefined;
  if (configDir !== '') {
    envs = Object.assign({}, process.env, {
      DOCKER_CONFIG: configDir
    }) as {
      [key: string]: string;
    };
    core.info(`Alternative config dir: ${configDir}`);
  }
  await Docker.getExecOutput(['logout', registry], {
    ignoreReturnCode: true,
    env: envs
  }).then(res => {
    if (res.stderr.length > 0 && res.exitCode != 0) {
      core.warning(res.stderr.trim());
    }
  });
}

export async function loginStandard(registry: string, username: string, password: string, scope?: string, retryArgs?: context.RetryArgs): Promise<void> {
  if (!username && !password) {
    throw new Error('Username and password required');
  }
  if (!username) {
    throw new Error('Username required');
  }
  if (!password) {
    throw new Error('Password required');
  }
  await loginExec(registry, username, password, scope, retryArgs);
}

export async function loginECR(registry: string, username: string, password: string, scope?: string, retryArgs?: context.RetryArgs): Promise<void> {
  core.info(`Retrieving registries data through AWS SDK...`);
  const regDatas = await aws.getRegistriesData(registry, username, password);
  for (const regData of regDatas) {
    await loginExec(regData.registry, regData.username, regData.password, scope, retryArgs);
  }
}

async function loginExec(registry: string, username: string, password: string, scope?: string, retryArgs?: context.RetryArgs): Promise<void> {
  let envs: {[key: string]: string} | undefined;
  const configDir = context.scopeToConfigDir(registry, scope);
  if (configDir !== '') {
    envs = Object.assign({}, process.env, {
      DOCKER_CONFIG: configDir
    }) as {
      [key: string]: string;
    };
    core.info(`Logging into ${registry} (scope ${scope})...`);
  } else {
    core.info(`Logging into ${registry}...`);
  }

  const retry = retryArgs || {attempts: 0, delayMs: 5000};

  await withRetry(
    async () => {
      await Docker.getExecOutput(['login', '--password-stdin', '--username', username, registry], {
        ignoreReturnCode: true,
        silent: true,
        input: Buffer.from(password),
        env: envs
      }).then(res => {
        if (res.stderr.length > 0 && res.exitCode != 0) {
          throw new Error(res.stderr.trim());
        }
        core.info('Login Succeeded!');
      });
    },
    retry,
    `Login to ${registry}`
  );
}
