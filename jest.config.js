module.exports = {
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["/node_modules/"],
  runner: "groups",
  setupFiles: ["./tests/jestSetup.ts"],
  coverageProvider: "v8",
};
