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

import fs from 'node:fs';

import archiver from 'archiver';

/**
 * Compress the provided source directory to the provided zip file path.
 *
 * @param {string} sourceDirectoryPath
 * @param {string} destinationZipFilePath
 */
export function compress(sourceDirectoryPath, destinationZipFilePath) {
  const job = archiver('zip', {zlib: {level: 9}});
  const destinationStream = fs.createWriteStream(destinationZipFilePath);

  return new Promise((resolve, reject) => {
    job.directory(sourceDirectoryPath, false);
    job.pipe(destinationStream);

    // @ts-expect-error (this appears to be harmless)
    destinationStream.on('close', resolve);

    job.on('error', reject);
    destinationStream.on('error', reject);

    job.finalize();
  });
}
