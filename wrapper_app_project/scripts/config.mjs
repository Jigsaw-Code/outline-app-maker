import { promises as fs } from 'node:fs'
import path from 'node:path'

import minimist from 'minimist'
import YAML from 'yaml'


/**
 * @typedef {{
 *   additionalDomains: Array<string>;
 *   appId: string;
 *   appName: string;
 *   domainList: string;
 *   entryDomain: string;
 *   entryUrl: string;
 *   output: string;
 *   platform: string;
 *   smartDialerConfig: string;
 * }} Config
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
 * Validate and normalize a provided (unknown) config, throwing an error if
 * required parameters are missing.
 *
 * @param {Record<string, unknown>} inputConfig
 * @returns {Config}
 */
export function validateAndNormalizeConfig(inputConfig) {
  const resolvedConfig = {};
  
  if (typeof inputConfig.entryUrl !== "string") {
    throw new Error(`"entryUrl" parameter not provided in parameters or YAML configuration.`);
  }
  if (typeof inputConfig.platform !== "string") {
    throw new Error(`"platform" parameter not provided in parameters or YAML configuration.`);
  }
  
  resolvedConfig.entryDomain = new URL(inputConfig.entryUrl).hostname;
  resolvedConfig.entryUrl = inputConfig.entryUrl;
  resolvedConfig.output = inputConfig.output ?? `output/${new URL(inputConfig.entryUrl).hostname}`;
  resolvedConfig.platform = inputConfig.platform;

    
  resolvedConfig.appId = typeof inputConfig.appId === "string"
    ? inputConfig.appId
    // Infer an app ID from the entry domain by reversing it (e.g. `www.example.com` becomes `com.example.www`)
    // It must be lower case, and hyphens are not allowed.
    : resolvedConfig.entryDomain
      .replaceAll('-', '')
      .toLocaleLowerCase()
      .split('.')
      .reverse()
      .join('.')

  if (!inputConfig.appName) {
    // Infer an app name from the base entry domain part by title casing the root domain:
    // (e.g. `www.my-example-app.com` becomes "My Example App")
    resolvedConfig.appName = resolvedConfig.entryDomain
      .split('.')
      .reverse()[1]
      .split(/[-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  
  resolvedConfig.additionalDomains = (
    Array.isArray(inputConfig.additionaldomain) &&
    inputConfig.additionaldomain.every((item) => typeof item === "string")
  )
    ? inputConfig.additionaldomain
    : []
  resolvedConfig.domainList = [resolvedConfig.entryDomain, ...resolvedConfig.additionalDomains].join('\n')
  resolvedConfig.smartDialerConfig = Buffer.from(JSON.stringify(inputConfig.smartDialerConfig)).toString('base64')

  return resolvedConfig;
}
