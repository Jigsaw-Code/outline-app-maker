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
