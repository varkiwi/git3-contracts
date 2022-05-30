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

Here are the addresses for Nervo's Godwoken v1:

    * GitRepoManagementFacet's address is: 0xC8768cD5f8D1c05876A2E92f6d91687933C65D53
    * GitBranchFacet's address is:         0xf754757E1C896dB5e773b8cD096B60A22E16d913
    * GitIssuesFacet's address is:         0xf9aDC122437693D216913a1d3159d0b57Ad1F202
    * GitTipsFacet's address is:           0x391748A16d92Dd2F09636249502f2CC60878E60f
    * GitContractRegistry's address is:    0xC432199644D0d08F17b635740A08A9B03f4d82a3
    * GitFactory's address:                0x9639eB95Ae2Ba325027006fb2D81f667e3ebFE18

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