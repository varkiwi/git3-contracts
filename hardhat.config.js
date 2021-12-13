require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
const fs = require('fs');
const { uploadABIToPinata } = require("pin-abi");
const { task } = require("hardhat/config");
const { exit } = require("process");

// const { uploadABIToPinata } = require("./tasks/uploadABIToPinata");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("upload", "Upload Smart Contracts ABI to Pinata")
  .addParam("name", "The name for the Pinata Pin")
  .setAction(async (taskArgs) => {
    const c = await uploadABIToPinata(taskArgs.name);
    console.log(c);
  });

function readPrivateKey(name) {
  try {
    const data = fs.readFileSync(`secrets/${name}`, 'utf8');
    return data;
  } catch (err) {
    console.error(err.message);
    return '';
  }
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.6",
  networks: {
    hardhat: {},
    maticTestnet: {
      url: "https://rpc-mumbai.maticvigil.com",
      //TODO: If I want to use the hardhat network, the key for matic is still read.
      // What for? If the file does not exist, hardhat gives Error HH8. Why?
      // Could be avoided, since I am not using these network settings.
      accounts: [readPrivateKey("maticTestnet.key")]
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000
    }
  }
};

