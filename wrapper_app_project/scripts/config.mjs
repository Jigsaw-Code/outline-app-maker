import {promises as fs} from 'node:fs';
import path from 'node:path';

import minimist from 'minimist';
import YAML from 'yaml';

/**
 * Raw build config (provided by user).
 *
 * @typedef {{
 *   additionaldomain?: string | Array<string>;
 *   appId?: string;
 *   appName?: string;
 *   entryUrl?: string;
 *   output?: string;
 *   platform?: string;
 *   smartDialerConfig?: string;
 * }} RawBuildConfig
 */

/**
 * Raw build config with required properties set.
 *
 * @typedef {RawBuildConfig & {
 *   entryUrl: string;
 *   platform: string;
 * }} ValidRawBuildConfig
 */

/**
 * Resolved build config (includes derived properties).
 *
 * @typedef {{
 *   additionalDomains: Array<string>;
 *   appId: string;
 *   appName: string;
 *   domainList: string;
 *   entryDomain: string;
 *   entryUrl: string;
 *   output: string;
 *   platform: string;
 *   smartDialerConfigBase64: string;
 * }} ResolvedBuildConfig
 */

/**
 * Parse a provided YAML file, returning an object.
 *
 * If the YAML file doesn't parse as an object (e.g. if it contains a primitive
 * or sequence/list) an empty object will be returned instead (and a warning
 * will be output).
 *
 * @param {string} filepath
 * @returns {Promise<{}>}
 */
export async function yamlBuildConfigToObject(filepath) {
  try {
    const data = await fs.readFile(filepath, 'utf8');

    if (data) {
      const parsedData = YAML.parse(data);

      if (
        parsedData &&
        typeof parsedData === 'object' &&
        !Array.isArray(parsedData)
      ) {
        // This type assertion may not be 100% guaranteed but for the purposes
        // of this use case should be correct
        return /** @type {{}} */ (parsedData);
      } else {
        console.warn(`${filepath} contained invalid config data:`, parsedData);
      }
    } else {
      console.warn(`${filepath} contained no data`);
    }
  } catch (e) {
    console.warn(`Error loading ${filepath}:`, e);
  }

  return {};
}

/**
 * @param {NodeJS.Process["argv"]} args
 */
export function getCliBuildConfig(args) {
  const dict = minimist(args);
  return {
    ...dict,
    additionalDomains: dict.additionalDomains?.split(',') ?? [],
  };
}

/**
 * Validate that provided rawBuildConfig is valid. Logs failure reason to console.
 *
 * @param {RawBuildConfig} rawBuildConfig
 *
 * @returns {rawBuildConfig is ValidRawBuildConfig}
 */
export function isValidRawBuildConfig(rawBuildConfig) {
  const entryUrlIsValidUrl = (() => {
    if (typeof rawBuildConfig.entryUrl !== 'string') {
      return false;
    }

    try {
      // Throws if entryUrl is invalid
      new URL(rawBuildConfig.entryUrl);
      return true;
    } catch (e) {
      return false;
    }
  })();

  if (!entryUrlIsValidUrl) {
    console.error(
      '"entryUrl" parameter must be provided and begin with "http".',
    );
    return false;
  }
  if (
    typeof rawBuildConfig.platform !== 'string' ||
    !['android', 'ios'].includes(rawBuildConfig.platform)
  ) {
    console.error(
      '"platform" parameter must be provided and be set to "android" or "ios".',
    );
    return false;
  }

  return true;
}

/**
 * Convert ValidRawBuildConfig to ResolvedBuildConfig.
 *
 * @param {ValidRawBuildConfig} validRawBuildConfig
 * @returns {ResolvedBuildConfig}
 */
export function resolveBuildConfig(validRawBuildConfig) {
  const resolvedBuildConfig = {};

  resolvedBuildConfig.entryDomain = new URL(
    validRawBuildConfig.entryUrl,
  ).hostname;
  resolvedBuildConfig.entryUrl = validRawBuildConfig.entryUrl;
  resolvedBuildConfig.output =
    typeof validRawBuildConfig.output === 'string'
      ? validRawBuildConfig.output
      : `output/${new URL(validRawBuildConfig.entryUrl).hostname}`;
  resolvedBuildConfig.platform = validRawBuildConfig.platform;

  if (
    typeof validRawBuildConfig.appId === 'string' &&
    validRawBuildConfig.appId.length >= 1
  ) {
    resolvedBuildConfig.appId = validRawBuildConfig.appId;
  } else if (
    typeof resolvedBuildConfig.entryDomain === 'string' &&
    resolvedBuildConfig.entryDomain.includes('.')
  ) {
    resolvedBuildConfig.appId = resolvedBuildConfig.entryDomain
      .replaceAll('-', '')
      .toLocaleLowerCase()
      .split('.')
      .reverse()
      .join('.');
  } else {
    resolvedBuildConfig.appId = 'app';
  }

  if (!validRawBuildConfig.appName) {
    // Infer an app name from the base entry domain part by title casing the root domain:
    // (e.g. `www.my-example-app.com` becomes "My Example App")
    resolvedBuildConfig.appName = resolvedBuildConfig.entryDomain
      .split('.')
      .reverse()[1]
      .split(/[-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  resolvedBuildConfig.additionalDomains =
    Array.isArray(validRawBuildConfig.additionaldomain) &&
    validRawBuildConfig.additionaldomain.every(item => typeof item === 'string')
      ? validRawBuildConfig.additionaldomain
      : [];
  resolvedBuildConfig.domainList = [
    resolvedBuildConfig.entryDomain,
    ...resolvedBuildConfig.additionalDomains,
  ].join('\n');
  resolvedBuildConfig.smartDialerConfigBase64 = Buffer.from(
    JSON.stringify(validRawBuildConfig.smartDialerConfig),
  ).toString('base64');

  return resolvedBuildConfig;
}
