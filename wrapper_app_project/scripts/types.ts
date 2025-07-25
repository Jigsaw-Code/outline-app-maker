export type SmartDialerConfig = {
  dns?: Array<
    | {system: {}}
    | {https: {name: string; address?: string}}
    | {tls: {name: string; address?: string}}
    | {tls: {name: string; address: string}}
    | {udp: {address: string}}
    | {tcp: {address: string}}
  >;
  tls?: Array<string>;
  fallback?: Array<string | {psiphon: {}}>;
};

export type Platform = 'android' | 'ios';

export type Config = {
  additionalDomains: Array<string>;
  appId: string;
  appName: string;
  domainList: Array<string>;
  entryDomain: string;
  entryUrl: string;
  output: string;
  platform: Platform;
  smartDialerConfig: SmartDialerConfig;
  smartDialerConfigBase64: string;
};

export type ConfigFile = Partial<
  // Omit derived properties
  Omit<Config, 'entryDomain' | 'domainList' | 'smartDialerConfigBase64'>
> &
  // Require entryUrl
  Pick<Config, 'entryUrl'>;
