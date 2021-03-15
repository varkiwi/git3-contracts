
## Compile contracts

```
npx hardhat compile
```

## Deploy Contracts
```
npx hardhat run --network <your-network> scripts/sample-script.js
```
A posibility is the build-in hardhat network:
```
npx hardhat run --network hardhat scripts/sample-script.js
```
If you want another network, you have to configure it in `hardhat.config.js` first.

## Testing contracts

```
npm hardhat test
```
and with coverage:
```
npm hardhat coverage
```
and in case you want to test just single files:
```
npx hardhat coverage --testfiles "test/*.js"
```

DiamondCutFacet's address is:        0x4815d445a56Df2b16053aA77764ec2ACC57C93d3
DiamondLoupeFacet's address is:      0x74944C481A0a37bFBb921fCBe922B20FF4CbCc66
Deployer's address is:               0x47462d1b9795562Fb20bd152EEa249c7a9F7Ce8C
GitRepoManagementFacet's address is: 0x82dC9D13c05a75281D61Dd5f7d23Bb2b30A1E70B
GitBranchFacet's address is:         0xB94C10D937C0a604f8A6dC15Af6807fcB00d2BDB
GitIssuesFacet's address is:         0x01F3E4b3Dae110c9F80D2ae96d88ba9047E6de8C
GitFactory's address:                0x5545fc8e2cc3815e351E37C6F2f372e2A878E364
