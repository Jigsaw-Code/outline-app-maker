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
import { promises as fs } from 'node:fs'
import path from 'node:path'

import minimist from 'minimist'
import YAML from 'yaml'


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

export async function getYAMLFileConfig(filepath) {
  try {
    const data = await fs.readFile(filepath, 'utf8')
    
    if (data) {
      return YAML.parse(data)
    }
  } catch (e) {
    if ('ENOENT' == e.code) {
      return {}
    }
  }
}

export function getCliConfig(args) {
  const dict = minimist(args)
  return {
    ...dict,
    additionalDomains: dict.additionalDomains?.split(',') ?? []
  }
}