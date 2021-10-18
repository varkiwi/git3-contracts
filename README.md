# GIT 3

The idea behind Git3 is to combine the power of git and blockchain: Storing code in a decentralized manner and receive payments without the need of a third party.

Each repository is represented by a smart contract, which stores all managing information and receives the payments, like tips or bounties for issues.

The content of the repository is stored on IPFS using a data structure, very similar to git's internal objects. 

In order to be able to use git3, a git3 client is created, which is similar to git. This makes the switch to git3 easier.


## Smart Contracts Address:
The smart contracts are currently deployed on Polygons Mumbai Testnet. Here are the addresses:

    * DiamondCutFacet's address is:        0x4815d445a56Df2b16053aA77764ec2ACC57C93d3
    * DiamondLoupeFacet's address is:      0x74944C481A0a37bFBb921fCBe922B20FF4CbCc66
    * Deployer's address is:               0x47462d1b9795562Fb20bd152EEa249c7a9F7Ce8C
    * GitRepoManagementFacet's address is: 0x82dC9D13c05a75281D61Dd5f7d23Bb2b30A1E70B
    * GitBranchFacet's address is:         0xB94C10D937C0a604f8A6dC15Af6807fcB00d2BDB
    * GitIssuesFacet's address is:         0x01F3E4b3Dae110c9F80D2ae96d88ba9047E6de8C
    * GitFactory's address:                0x5545fc8e2cc3815e351E37C6F2f372e2A878E364

In case you want to download the abis, here is the CID: `QmcFseuVDBMEU92hkjfBL4J1XKFhbxEtDCGiSQ3AUExXcw`

## Compile contracts

```
npx hardhat compile
```

## Deploy Contracts
```
npx hardhat run --network <your-network> scripts/deployGitContracts.js
```
Currently supported networks:

    * hardhat       : npx hardhat run --network hardhat scripts/deployGitContracts.js
    * Mumbai Testnet: npx hardhat run --network maticTesnet scripts/deployGitContracts.js

In order to deploy to a network, you need a private key. Create a secrets directory in the root of the project, create a file called `maticTestnet.key` and write the private key in. Without any quotes or whatsoever. Just plain hex string :)

## Testing contracts
Testing locally
```
npx hardhat test --network hardhat
```
and with code coverage:
```
npx hardhat coverage
```
and in case you want to test just single files:
```
npx hardhat coverage --testfiles "test/*.js"
```

If you want to test the contracts on the network, just run:
```
npx hardhat test --network maticTestnet
```
You will require a file with a private key in the secrets directory: secrets/maticTestnet.key

## Upload ABI to Pinata

```
npx hardhat upload --name [name]
```