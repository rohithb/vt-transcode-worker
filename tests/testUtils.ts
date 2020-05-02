import { readFileSync } from "fs";
import path from "path";

/**
 * Read string from a given file. Provides a cleaner way to access test assets
 *
 * **Only use this method for writing tests.**
 * @param filePath path of the file relative to __assets__ folder
 */
export function readAsset(filePath: string): string {
  const currentFilePath = path.dirname(__filename);
  return readFileSync(path.resolve(currentFilePath + "/__assets__/" + filePath)).toString();
}

/**
 * Returns the absolute path of the asset file
 * @param filePath path of the file relative to __assets__ folder
 */
export function getAssetPath(filePath: string): string {
  const currentFilePath = path.dirname(__filename);
  return path.resolve(currentFilePath + "/__assets__/" + filePath);
}
