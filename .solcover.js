const shell = require("shelljs");
const ganache = require("ganache-cli");
// The environment variables are loaded in hardhat.config.ts
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

module.exports = {
  client: ganache,
  istanbulReporter: ["html", "lcov"],
  onServerReady: async function (_config) {
  },
  onCompileComplete: async function (_config) {
    await run("typechain");
  },
  onIstanbulComplete: async function (_config) {
    // We need to do this because solcover generates bespoke artifacts.
    shell.rm("-rf", "./artifacts");
    shell.rm("-rf", "./typechain");
  },
  skipFiles: ["mocks", "test", "CappedCrowdsale", "FinalizableCrowdsale", "RefundVault"],
};
