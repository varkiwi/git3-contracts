# GIT 3

The idea behind Git3 is to combine the power of git and blockchain: Storing code in a decentralized manner and receive payments without the need of a third party.

Each repository is represented by a smart contract, which stores all managing information and receives the payments, like tips or bounties for issues.

The content of the repository is stored on IPFS using a data structure, very similar to git's internal objects. 

In order to be able to use git3, a git3 client is created, which is similar to git. This makes the switch to git3 easier.


## Smart Contracts Address:
The smart contracts are currently deployed on Polygons Mumbai and Nervo's Godwoken Testnet.
Here are the addresses for Polygon Mumbai:

    * GitRepoManagementFacet's address is:  0x330b6EfbBD495C6d3eF0eE6a69218f0d9Fc6f350
    * GitBranchFacet's address is:          0x22972b287816881F91838Ed5a75946f2DAE68956
    * GitIssuesFacet's address is:          0x2109e3aBb34E4cf5B25a3d88743EaB0ce44349cA
    * GitTipsFacet's address is:            0xE8727949fC7607a58d87b7397B15e0a5fDC7050b
    * GitRepoContractRegistry's address is: 0xBdE9C89C79435514e840660e35D7D60d91a60BcD

    * RepositoryManagement's address is:       0xEb43C0546b712B2D07EaCa1b007a64fA8bF4A31D
    * GitFactoryTips's address is:             0x7d101a12d6Ad0e4c88318a92e62A78B91040F8E0
    * GitFactoryContractRegistry's address is: 0x5adD82e550881e361AE034b4a351B92c71a8181a
    * GitFactory's address is:                 0x289C243B54dCe04945176Bb00Beaa3DCf53B3C1d

Here are the addresses for Nervo's Godwoken v1:

    * GitRepoManagementFacet's address is:  0x6c8A7363Cd2e814b779349E1B9c3e7cb6D9592da
    * GitBranchFacet's address is:          0x2F941A19d3c573d74BBbf5DC78363E15B1CE620a
    * GitIssuesFacet's address is:          0xad9d55b7223e4cD8BF1Ec6e9eA28b5BfADd81298
    * GitTipsFacet's address is:            0x82867391d5C280A09B16d1d2C84ab83Fc0995BcB
    * GitRepoContractRegistry's address is: 0xc6289F7fa0dA125B2FFA932c9A655a99a5427073

    * RepositoryManagement's address is:       0xf7412EBBA50F432Fc7B6DD5EF097861cd94036f7
    * GitFactoryTips's address is:             0xCDd06C17354d0697E6d22E3941390a7cCFc591A7
    * GitFactoryContractRegistry's address is: 0x3310b4e95a98D3418fBD75304cf3853f0a7A124f
    * GitFactory's address is:                 0x4DBF5e2d170d513dE734294Db921808957Ffe92d

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