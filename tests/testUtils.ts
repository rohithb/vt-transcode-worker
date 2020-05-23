import { readFileSync } from "fs";
import path from "path";
import fs from "fs";
import Logger from "../src/helpers/Logger";
import LoggerMock from "./__mocks__/helpers/Logger";
import ConfigMock from "./__mocks__/helpers/Config";
import { container } from "tsyringe";
import mockAmqplib from "mock-amqplib";
import amqpOriginalLib from "amqplib";

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

/**
 * Mocks the logger
 */
export function mockLogger() {
  container.registerSingleton(Logger, LoggerMock);
}
/**
 * returns a mock config object
 * @param dict key value pair
 */
export function getMockConfig(dict: Record<string, any>) {
  return new ConfigMock(dict);
}

/**
 * returns a mock amqp connection and channel for a given queue name
 * @param queueName
 */
export async function getMockAmqpConnectionAndChannel(queueName: string) {
  const mockAmqpConnection = await mockAmqplib.connect("something");
  const channel = await mockAmqpConnection.createChannel();
  await channel.assertQueue(queueName, { durable: true });
  return { connection: mockAmqpConnection, channel };
}
