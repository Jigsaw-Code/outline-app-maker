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
  smartDialerConfig: object;
  smartDialerConfigBase64: string;
};

export type ConfigFile = Partial<
  // Omit derived properties
  Omit<Config, 'entryDomain' | 'domainList' | 'smartDialerConfigBase64'>
> &
  // Require entryUrl
  Pick<Config, 'entryUrl'>;
