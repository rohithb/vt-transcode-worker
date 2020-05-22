module.exports = {
  globals: {
    "ts-jest": {
      tsConfig: "./tsconfig.json",
    },
  },
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/"],
  runner: "groups",
  setupFiles: ["./tests/jestSetup.ts"],
  moduleNameMapper: {
    "@tests/(.*)": "<rootDir>/tests/$1",
    "@/(.*)": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/helpers/Logger.ts",
    "!src/helpers/Config.ts",
    "!src/register.ts",
    "!src/index.ts",
    "!src/types/*.ts",
  ],
};
