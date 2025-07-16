import { promises as fs } from 'node:fs'
import path from 'node:path'

import minimist from 'minimist'
import YAML from 'yaml'

/**
 * Config provided by user.
 * 
 * @typedef {{
 *   additionaldomain?: string | Array<string>;
 *   appId?: string;
 *   appName?: string;
 *   entryUrl?: string;
 *   output?: string;
 *   platform?: string;
 *   smartDialerConfig?: string;
 * }} Config
 */

/**
 * Config with required properties set.
 * 
 * @typedef {Config & {
 *   entryUrl: string;
 *   platform: string;
 * }} ValidConfig
 */

/**
 * Internal config (includes derived properties).
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
 * }} InternalConfig
 */

/**
 * @satisfies {Config}
 */
export const DEFAULT_CONFIG = {
  output: path.join(process.cwd(), 'output'),
  smartDialerConfig: JSON.stringify({
    dns: [
      {
        https: { name: '9.9.9.9' }
      }
    ],
    tls: [
      '',
      'split:1',
      'split:2',
      'tlsfrag:1'
    ],   
  })
}

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
export async function getYAMLFileConfig(filepath) {
  try {
    const data = await fs.readFile(filepath, 'utf8')
    
    if (data) {
      const parsedData = YAML.parse(data);

      if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        // This type assertion may not be 100% guaranteed but for the purposes
        // of this use case should be correct
        return /** @type {{}} */ (parsedData);
      } else {
        console.warn(`${filepath} contained invalid config data:`, parsedData)
      }
    } else {
      console.warn(`${filepath} contained no data`)
    }
  } catch (e) {
    console.warn(`Error loading ${filepath}:`, e)
  }

  return {};
}

/**
 * @param {NodeJS.Process["argv"]} args
 */
export function getCliConfig(args) {
  const dict = minimist(args)
  return {
    ...dict,
    additionalDomains: dict.additionalDomains?.split(',') ?? []
  }
}

/**
 * 
 * @param {Config} args 
 * 
 * @returns {ValidConfig | { error: string }}
 */
export function validateConfig(args) {
  if (typeof args.entryUrl !== "string" || !args.entryUrl.startsWith("http")) {
    return {error: `"entryUrl" parameter must be provided and begin with "http".`};
  }
  if (typeof args.platform !== "string" || !["android", "ios"].includes(args.platform)) {
    return {error: `"platform" parameter must be provided and be set to "android" or "ios".`};
  }

  return {
    ...args,
    entryUrl: args.entryUrl,
    platform: args.platform,
  };
}

/**
 * Convert ValidConfig to InternalConfig.
 *
 * @param {ValidConfig} validConfig
 * @returns {InternalConfig}
 */
export function makeInternalConfig(validConfig) {
  const internalConfig = {};
  
  internalConfig.entryDomain = new URL(validConfig.entryUrl).hostname;
  internalConfig.entryUrl = validConfig.entryUrl;
  internalConfig.output = typeof validConfig.output === "string" ? validConfig.output : `output/${new URL(validConfig.entryUrl).hostname}`;
  internalConfig.platform = validConfig.platform;

    
  internalConfig.appId = typeof validConfig.appId === "string"
    ? validConfig.appId
    // Infer an app ID from the entry domain by reversing it (e.g. `www.example.com` becomes `com.example.www`)
    // It must be lower case, and hyphens are not allowed.
    : internalConfig.entryDomain
      .replaceAll('-', '')
      .toLocaleLowerCase()
      .split('.')
      .reverse()
      .join('.')

  if (!validConfig.appName) {
    // Infer an app name from the base entry domain part by title casing the root domain:
    // (e.g. `www.my-example-app.com` becomes "My Example App")
    internalConfig.appName = internalConfig.entryDomain
      .split('.')
      .reverse()[1]
      .split(/[-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  
  internalConfig.additionalDomains = (
    Array.isArray(validConfig.additionaldomain) &&
    validConfig.additionaldomain.every((item) => typeof item === "string")
  )
    ? validConfig.additionaldomain
    : []
  internalConfig.domainList = [internalConfig.entryDomain, ...internalConfig.additionalDomains].join('\n')
  internalConfig.smartDialerConfigBase64 = Buffer.from(JSON.stringify(validConfig.smartDialerConfig)).toString('base64')

  return internalConfig;
}
