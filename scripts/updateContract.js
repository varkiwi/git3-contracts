const hre = require("hardhat");
const web3Abi = require("web3-eth-abi");

function getSelectors(contractFunctions) {
  selectors = [];
  for (func in contractFunctions) {
    if (func.includes('(')) {
      selectors.push(web3Abi.encodeFunctionSignature(func));
    }
  };
  return selectors;
}

async function deployContract(contractName, args) {
    const contractFactory = await hre.ethers.getContractFactory(contractName);
    let contractInstance;
    if (args !== undefined) {
      contractInstance = await contractFactory.deploy(...args);
    } else {
      contractInstance = await contractFactory.deploy();
    }
    return contractInstance;
}

async function main() {
    // const gitFactoryAddress = "0x4DBF5e2d170d513dE734294Db921808957Ffe92d";
    // const gitFactory = await hre.ethers.getContractFactory("GitFactory");
    // const gitFactoryContract = await gitFactory.attach(gitFactoryAddress);
    // console.log(await gitFactoryContract.gitFactoryContractRegistry());
    const registryAddress = "0x3310b4e95a98D3418fBD75304cf3853f0a7A124f";
    const contractToDeleteAddress = "0xb9D184a98557B92EB25583697DdCB6ed5Ec8Ed3d";

    const registryContractFactory = await hre.ethers.getContractFactory("GitFactoryContractRegistry");
    const registryContract = await registryContractFactory.attach(registryAddress);

    const contractToDeleteFromRegistryFactory = await hre.ethers.getContractFactory("RepositoryManagement");
    const contractToDeleteFromRegistry = await contractToDeleteFromRegistryFactory.attach(contractToDeleteAddress);
    const signaturesToDelete = getSelectors(contractToDeleteFromRegistry.functions);
    console.log('Sigs to delete', signaturesToDelete);

    // for (let i = 0; i < signaturesToDelete.length; i++) {
    //     let result;
    //     try {
    //         result = await registryContract.getContractAddress(ethers.utils.hexlify(signaturesToDelete[i])); 
    //     } catch (err) {
    //         console.log('Err', err)
    //         continue
    //     }

    //     if (result !== contractToDeleteAddress) {
    //         signaturesToDelete.splice(i, 1);
    //         i -= 1;
    //     }
    // }

    // console.log('Sigs to delete', signaturesToDelete);

    // await registryContract.removeContractAddress(signaturesToDelete);

    for (let i = 0; i < signaturesToDelete.length; i++) {
        let result;
        try {
            result = await registryContract.getContractAddress(ethers.utils.hexlify(signaturesToDelete[i])); 
            console.log(result);
        } catch (err) {
            console.log('Err', err)
            continue
        }
    }

    // const contractToBeUpdatedFacet = await deployContract("RepositoryManagement");

    // await contractToBeUpdatedFacet.deployed();

    // console.log("Contract's address is:", contractToBeUpdatedFacet.address);

    // let diamondCutFactory = {
    //     facetAddress: contractToBeUpdatedFacet.address,
    //     functionSelectors: getSelectors(contractToBeUpdatedFacet.functions)
    // };

    // await registryContract.addContractAddress(diamondCutFactory);
    // console.log('Done :)');

    console.log(await registryContract.contractAddress(0));
    console.log(await registryContract.contractAddress(1));
    console.log(await registryContract.contractAddress(2));
    console.log(await registryContract.contractAddress(3));
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });