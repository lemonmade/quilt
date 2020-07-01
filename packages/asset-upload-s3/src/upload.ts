import {createReadStream} from 'fs';
import {S3} from 'aws-sdk';
import {createUpload, retryablePromise} from '@quilted/asset-upload';
import type {
  FileUploadResult,
  Options as BaseOptions,
} from '@quilted/asset-upload';

interface ManifestOptions {
  file?: string;
  bucket?: string;
}

interface Options {
  region?: string;
  prefix?: string;
  bucket: string;
  buildDirectory: string;
  manifest?: ManifestOptions | boolean;
  ignore?: BaseOptions['ignore'];
}

export async function upload({
  buildDirectory,
  prefix,
  region,
  bucket,
  ignore,
  manifest: manifestOptions,
}: Options) {
  const s3 = new S3({region});

  const manifest = await loadManifest(s3, bucket, manifestOptions);

  const upload = createUpload({
    buildDirectory,
    prefix,
    ignore,
    has: (file) => manifest.has(file),
    async upload({publicPath, localPath, headers}) {
      const metadata: {[key: string]: string} = {};
      const options: S3.PutObjectRequest = {
        Bucket: bucket,
        Key: publicPath,
        Body: createReadStream(localPath),
      };

      for (const [header, value] of headers) {
        switch (header.toLowerCase()) {
          case 'cache-control': {
            options.CacheControl = value;
            break;
          }
          case 'content-encoding': {
            options.ContentEncoding = value;
            break;
          }
          case 'content-type': {
            options.ContentType = value;
            break;
          }
          default: {
            metadata[header] = value;
            break;
          }
        }
      }

      if (Object.keys(metadata).length > 0) options.Metadata = metadata;

      await s3Upload(s3, options);
    },
  });

  upload.on('files:found', (files) => {
    const skippedFiles = files.original.length - files.filtered.length;

    if (skippedFiles > 0) {
      log(
        `Skipping ${skippedFiles} ${
          skippedFiles === 1 ? 'file that was' : 'files that were'
        } previously uploaded`,
      );
    }

    log(
      `Starting upload for ${files.filtered.length} ${
        files.filtered.length === 1 ? 'file' : 'files'
      }`,
    );
  });

  upload.on('file:upload:error', (file, error) => {
    log(`Error while uploading ${file.localPath}`);
    log(error);
  });

  upload.on('file:upload:end', (file) => {
    log(
      `Uploaded ${file.localPath} in ${
        file.timing.end - file.timing.start
      }ms (cdn path: ${file.publicPath})`,
    );
  });

  try {
    const uploadResults = await upload.run();

    if (uploadResults.length === 0) {
      log(`No new files to upload (all files were already uploaded)`);
    } else {
      log(
        `Successfully uploaded ${uploadResults.length} ${
          uploadResults.length === 1 ? 'file' : 'files'
        }`,
      );
    }
    try {
      await manifest.update(uploadResults);
      log(`Updated asset manifest`);
    } catch (error) {
      log(
        `Failed to update manifest, but ignoring because it just means a future CI run will upload a few unnecessary assets`,
      );
      log(error);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  }
}

interface Manifest {
  has(file: string): boolean;
  update(results: FileUploadResult[]): Promise<void>;
}

async function loadManifest(
  s3: S3,
  bucket: string,
  manifest: Options['manifest'] = {},
): Promise<Manifest> {
  if (manifest === false) {
    return {has: () => false, update: () => Promise.resolve()};
  }

  const {bucket: manifestBucket, file: manifestFile} =
    typeof manifest === 'boolean' ? ({} as ManifestOptions) : manifest;

  const finalBucket = manifestBucket ?? bucket;
  const finalFile = manifestFile
    ? normalizeManifestFile(manifestFile)
    : 'manifest.json';

  const update: Manifest['update'] = (results) =>
    s3Upload(s3, {
      Bucket: finalBucket,
      Key: finalFile,
      Body: JSON.stringify(results, null, 2),
    });

  try {
    const {Body: result} = await s3
      .getObject({Bucket: finalBucket, Key: finalFile})
      .promise();

    const seen = new Set(result ? JSON.parse(result.toString()) : []);

    return {
      has: (file) => seen.has(file),
      update,
    };
  } catch (error) {
    log(`Failed to load manifest ${finalFile} from bucket ${finalBucket}`);
    return {has: () => false, update};
  }
}

function s3Upload(s3: S3, options: S3.PutObjectRequest) {
  return retryablePromise(() => s3.upload(options).promise());
}

function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

function normalizeManifestFile(file: string) {
  return file.endsWith('.json') ? file : `${file}.json`;
}
