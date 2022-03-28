# GIT 3

The idea behind Git3 is to combine the power of git and blockchain: Storing code in a decentralized manner and receive payments without the need of a third party.

Each repository is represented by a smart contract, which stores all managing information and receives the payments, like tips or bounties for issues.

The content of the repository is stored on IPFS using a data structure, very similar to git's internal objects. 

In order to be able to use git3, a git3 client is created, which is similar to git. This makes the switch to git3 easier.


## Smart Contracts Address:
The smart contracts are currently deployed on Polygons Mumbai and Nervo's Godwoken Testnet.
Here are the addresses for Polygon Mumbai:

    * GitRepoManagementFacet's address is: 0x1865DE7Ed3D1B3d3603e417DA7bd0Ba42D483234
    * GitBranchFacet's address is:         0xCE466a8c46747228448D1D4BC6e3939499c6a36F
    * GitIssuesFacet's address is:         0x2a4c626D058D3FD9475E1637C8C62D1B46D0a0d5
    * GitTipsFacet's address is:           0x3e40ACfAd00D27aF22bC9225A6c76eE56BD3C38e
    * GitContractRegistry's address is:    0x1A5e394A7c68F147549e5dF4C8EaA9FbE9e7dA62
    * GitFactory's address:                0x9Af5B605f4c9833692DF8cCcF021d62C6Cc4df8F

Here are the addresses for Nervo's Godwoken:

    * GitRepoManagementFacet's address is: 0x9639eB95Ae2Ba325027006fb2D81f667e3ebFE18
    * GitBranchFacet's address is:         0x6c8A7363Cd2e814b779349E1B9c3e7cb6D9592da
    * GitIssuesFacet's address is:         0x2F941A19d3c573d74BBbf5DC78363E15B1CE620a
    * GitTipsFacet's address is:           0xad9d55b7223e4cD8BF1Ec6e9eA28b5BfADd81298
    * GitContractRegistry's address is:    0x82867391d5C280A09B16d1d2C84ab83Fc0995BcB
    * GitFactory's address:                0xc6289F7fa0dA125B2FFA932c9A655a99a5427073

In case you want to download the abis, here is the CID: `QmYBw83oKD3YDSeC2MyVDS3a3E5zbej6Z9iDQd185zABsk`

## Compile contracts

```
npx hardhat compile
```

## Deploy Contracts
```
npx hardhat run --network <your-network> scripts/deployGitContracts.js
```
Currently supported networks:

    * hardhat         : npx hardhat run --network hardhat scripts/deployGitContracts.js
    * Mumbai Testnet  : npx hardhat run --network maticTestnet scripts/deployGitContracts.js
    * Nervo's Godwoken: npx hardhat run --network godwoken scripts/deployGitContracts.js

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
npx hardhat test [path/to/file1, path/to/file2]
```
and with coverage:
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