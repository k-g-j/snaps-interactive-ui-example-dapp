import { assertIsSnapIcon } from './icon';
import {
  getValidatedLocalizationFiles,
  validateSnapManifestLocalizations,
} from './localization';
import { validateNpmSnapManifest } from './manifest/manifest';
import { assertIsSnapManifest } from './manifest/validation';
import type { SnapFiles, UnvalidatedSnapFiles } from './types';
import { assertIsNpmSnapPackageJson, NpmSnapFileNames } from './types';

export const EXPECTED_SNAP_FILES = [
  'manifest',
  'packageJson',
  'sourceCode',
] as const;

export const SnapFileNameFromKey = {
  manifest: NpmSnapFileNames.Manifest,
  packageJson: NpmSnapFileNames.PackageJson,
  sourceCode: 'source code bundle',
} as const;

// TODO: Refactor this to be more shared with other validation.

/**
 * Validates the files extracted from an npm Snap package tarball by ensuring
 * that they're non-empty and that the Json files match their respective schemas
 * and the Snaps publishing specification.
 *
 * @param snapFiles - The object containing the expected Snap file contents,
 * if any.
 * @param errorPrefix - The prefix of the error message.
 * @returns A tuple of the Snap manifest object and the Snap source code.
 */
export async function validateNpmSnap(
  snapFiles: UnvalidatedSnapFiles,
  errorPrefix?: `${string}: `,
): Promise<SnapFiles> {
  EXPECTED_SNAP_FILES.forEach((key) => {
    if (!snapFiles[key]) {
      throw new Error(
        `${errorPrefix ?? ''}Missing file "${SnapFileNameFromKey[key]}".`,
      );
    }
  });

  // Typecast: We are assured that the required files exist if we get here.
  const {
    manifest,
    packageJson,
    sourceCode,
    svgIcon,
    auxiliaryFiles,
    localizationFiles,
  } = snapFiles as SnapFiles;

  try {
    assertIsSnapManifest(manifest.result);
  } catch (error) {
    throw new Error(`${errorPrefix ?? ''}${error.message}`);
  }
  const validatedManifest = manifest;

  const { iconPath } = validatedManifest.result.source.location.npm;
  if (iconPath && !svgIcon) {
    throw new Error(`Missing file "${iconPath}".`);
  }

  try {
    assertIsNpmSnapPackageJson(packageJson.result);
  } catch (error) {
    throw new Error(`${errorPrefix ?? ''}${error.message}`);
  }

  const validatedPackageJson = packageJson;
  await validateNpmSnapManifest({
    manifest: validatedManifest,
    packageJson: validatedPackageJson,
    sourceCode,
    svgIcon,
    auxiliaryFiles,
    localizationFiles,
  });

  if (svgIcon) {
    try {
      assertIsSnapIcon(svgIcon);
    } catch (error) {
      throw new Error(`${errorPrefix ?? ''}${error.message}`);
    }
  }

  if (localizationFiles) {
    try {
      // This function validates and returns the localization files. We don't
      // use the return value here, but we do want to validate the files.
      getValidatedLocalizationFiles(localizationFiles);

      validateSnapManifestLocalizations(
        manifest.result,
        localizationFiles.map((file) => file.result),
      );
    } catch (error) {
      throw new Error(`${errorPrefix ?? ''}${error.message}`);
    }
  }

  return {
    manifest: validatedManifest,
    packageJson: validatedPackageJson,
    sourceCode,
    svgIcon,
    auxiliaryFiles,
    localizationFiles,
  };
}
