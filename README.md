
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

Address of GitFactory contract on Matic Mainnet
0x5DD6E7D5F20a3ae586cFf4a03A54e51c32F02541
