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
  console.log('API 1', process.env.PINATA_API_KEY == '1d4acf5d6517a193c0f2');
  console.log('API 2',process.env.PINATA_API_SECRET == '123a9be8720ed624680e4d842aa94c73f3c343b6fbce02f820e34ef607d614a');
  try {
    const data = fs.readFileSync(`secrets/${name}`, 'utf8');
    return data;
  } catch (err) {
    console.error(err.message);
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

