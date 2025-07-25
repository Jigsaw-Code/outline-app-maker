import {promises as fs} from 'node:fs';
import path, {dirname} from 'node:path';
import tsj from 'ts-json-schema-generator';

import minimist from 'minimist';
import YAML from 'yaml';
import {Ajv} from 'ajv';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {import("./types.js").Config} Config
 * @typedef {import("./types.js").ConfigFile} ConfigFile
 * @typedef {import("./types.js").Platform} Platform
 */

/**
 * @returns {Promise<Config>}
 */
export default async function createConfig() {
  // ---------------------------------
  // --- Get and validate CLI args ---
  // ---------------------------------

  const cliArgs = minimist(process.argv);

  const unexpectedArgs = Object.keys(cliArgs).filter(
    arg => !['_', 'config', 'platform'].includes(arg),
  );

  if (unexpectedArgs.length > 0) {
    throw new Error(
      `Received unexpected arguments: ${unexpectedArgs.join(', ')}. Only config and platform may be passed as an argument -- everything else must be set in YAML config file (config.yaml or --config argument)`,
    );
  }

  // ------------------------------------------------
  // --- Validate YAML config against JSON schema ---
  // ------------------------------------------------

  const configLocation =
    typeof cliArgs.config === 'string' ? cliArgs.config : 'config.yaml';

  /** @type {unknown} */
  const yamlConfig = await (async () => {
    try {
      return YAML.parse(await fs.readFile(configLocation, 'utf8'));
    } catch (error) {
      if (configLocation === 'config.yaml') {
        throw new Error(
          'Please create a config.yaml (based on config-sample.yaml)',
        );
      } else {
        throw error;
      }
    }
  })();

  const configFileSchema = tsj
    .createGenerator({
      path: path.resolve(__dirname, './types.ts'),
      tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
    })
    .createSchema('ConfigFile');

  const ajv = new Ajv();
  const validateConfigFile = ajv.compile(configFileSchema);

  if (!validateConfigFile(yamlConfig)) {
    throw new Error(
      `Config file invalid: ${JSON.stringify(validateConfigFile.errors, null, 2)}`,
    );
  }

  const validArgs = /** @type {ConfigFile} */ (yamlConfig);

  // ----------------------------------
  // --- Get platform from CLI args ---
  // ----------------------------------

  const cliPlatform = cliArgs.platform;

  /** @type {null | Platform} */
  let platform = null;

  if (
    typeof cliPlatform === 'string' &&
    (cliPlatform === 'android' || cliPlatform === 'ios')
  ) {
    platform = cliPlatform;
  } else if (validArgs.platform === 'android' || validArgs.platform === 'ios') {
    platform = validArgs.platform;
  }

  if (!platform) {
    throw new Error(
      'Platform must be provided in config.yaml or --platform argument',
    );
  }

  // -------------------------------
  // --- Assign other properties ---
  // -------------------------------

  const additionalDomains = validArgs.additionalDomains ?? [];

  const entryUrl = validArgs.entryUrl;

  const entryDomain = new URL(entryUrl).hostname;

  const domainList = [entryDomain, ...(additionalDomains ?? [])];

  const output = validArgs.output ?? path.join(process.cwd(), 'output');

  const smartDialerConfig = validArgs.smartDialerConfig ?? {
    dns: [
      {
        https: {name: '9.9.9.9'},
      },
    ],
    tls: ['', 'split:1', 'split:2', 'tlsfrag:1'],
  };

  const smartDialerConfigBase64 = Buffer.from(
    JSON.stringify(smartDialerConfig),
  ).toString('base64');

  const appId = (() => {
    if (typeof validArgs.appId === 'string' && validArgs.appId.length >= 1) {
      return validArgs.appId;
    } else if (entryDomain.includes('.')) {
      return entryDomain
        .replaceAll('-', '')
        .toLocaleLowerCase()
        .split('.')
        .reverse()
        .join('.');
    } else {
      return 'app';
    }
  })();

  const appName = (() => {
    if (typeof validArgs.appName === 'string') {
      return validArgs.appName;
    } else {
      // Infer an app name from the base entry domain part by title casing the
      // root domain: (e.g. `www.my-example-app.com` becomes "My Example App")
      return entryDomain
        .split('.')
        .reverse()[1]
        .split(/[-_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
  })();

  // ---------------------
  // --- Return Config ---
  // ---------------------

  return {
    domainList,
    entryDomain,
    additionalDomains,
    appId,
    appName,
    entryUrl,
    output,
    platform,
    smartDialerConfig,
    smartDialerConfigBase64,
  };
}
