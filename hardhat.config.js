require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require('hardhat-contract-sizer');

const fs = require('fs');
const { uploadABIToPinata } = require("pin-abi");
const { task } = require("hardhat/config");

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
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

module.exports = {
  solidity: "0.7.6",
  networks: {
    hardhat: {
        initialBaseFeePerGas: 0,
    },
    maticTestnet: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [readPrivateKey("maticTestnet.key")]
    },
    godwoken: {
        url: "https://godwoken-testnet-v1.ckbapp.dev",
        accounts: [readPrivateKey("godwoken.key")]
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000
    }
  }
};

