require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
const fs = require('fs')

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

function readPrivateKey(name) {
  try {
    const data = fs.readFileSync(`privkeys/${name}.key`, 'utf8')
    return data;
  } catch (err) {
    console.error(err)
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
    maticTestnet: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [readPrivateKey("maticTestnet")]
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000
    }
  }
};

