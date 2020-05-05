import { readFileSync } from "fs";
import path from "path";
import fs from "fs";

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

export function removeOutputFiles(outputPath: string): void {
  if (fs.existsSync(outputPath)) {
    fs.readdirSync(outputPath).forEach(function (file, index) {
      var curPath = outputPath + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        removeOutputFiles(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(outputPath);
  }
}
