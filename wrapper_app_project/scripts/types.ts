// Copyright 2025 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
