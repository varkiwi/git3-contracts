const hre = require("hardhat");
const web3Abi = require("web3-eth-abi");

const FacetCutAction = {
  Add: 0,
  Replace: 1,
  Remove: 2
}

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
    const diamondCutFacet = await deployContract("DiamondCutFacet");
    const diamondLoupeFacet = await deployContract("DiamondLoupeFacet");
    const gitRepoManagementFacet = await deployContract("GitRepositoryManagement");
    const deployer = await deployContract("GitRepositoryDeployer");

    await diamondCutFacet.deployed();
    await diamondLoupeFacet.deployed();
    await deployer.deployed();
    await gitRepoManagementFacet.deployed();

    console.log("DiamondCutFacet's address is:", diamondCutFacet.address);
    console.log("DiamondLoupeFacet's address is:", diamondLoupeFacet.address);
    console.log("Deployer's address is:", deployer.address);
    console.log("GitRepoManagementFacet's address is:", gitRepoManagementFacet.address);

    const diamondCut = [
      [diamondCutFacet.address, FacetCutAction.Add, getSelectors(diamondCutFacet.functions)],
      [diamondLoupeFacet.address, FacetCutAction.Add, getSelectors(diamondLoupeFacet.functions)],
      [gitRepoManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepoManagementFacet.functions)]
    ];


    const gitFactory = await deployContract("GitFactory", [diamondCut, deployer.address]);
    // console.log('Filter:', gitFactory.filters.Test());
    // let logs = await ethers.provider.getLogs(gitFactory.filters.Test());
    // console.log('Logs', logs[0].data);
    // console.log('Logs', logs[1].data);
    await gitFactory.deployed();
    console.log("GitFactory's address:", gitFactory.address);
    // console.log("GitFactory's owner: ", await gitFactory.owner());

    // DEPLOY A NEW REPOSITORY
    await gitFactory.createRepository("TestRepo");
    console.log("Repo names:", await gitFactory.getRepositoryNames());

    const accounts = await hre.ethers.getSigners()
    let r = await gitFactory.getUserRepoNameHash(accounts[0].address, "TestRepo");
    r = await gitFactory.getRepository(r);
    console.log('>>', r);
    const gitRepoFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
    const gitRepo = await gitRepoFactory.attach(r.location);
    r = await gitRepo.getRepositoryInfo();
    console.log(r);
    // const gitManagementFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
    // const gitManagement = await gitManagementFactory.attach(r.location);
    // r = await gitManagement.getRepositoryInfo();
    // console.log(r)
    // We get the contract to deploy
    // const gitRepository = await deployContract("GitRepository", [diamondCut, [accounts[0].address]]);
    // await gitRepository.deployed();

    // console.log("GitRepository's address to:", gitRepository.address);
    // -----------------------------------------------------------------------------------------------------------------
    // DEPLOYMENT DONE - NOW TESTING

    // // GETTING FACET ADDRESSES
    // const diamondCutFactory = await hre.ethers.getContractFactory("DiamondCutFacet");
    // setting the proxies address for the contract, since we will go through the proxy!
    // const diamondCutContract = await diamondCutFactory.attach(gitRepository.address);

    // const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
    // const diamondLoupe = await diamondLoupeFactory.attach(gitRepository.address);

    // let r = await diamondLoupe.facetAddresses();
    // console.log(r);

    // // REGISTERIN NEW CONTRACT
    // let test1facet = await deployContract("Test1Facet");
    // await test1facet.deployed();
    // console.log("Test1Facet's address: ", test1facet.address);

    // // we are slicing the result from getSelectors, because supportsInterface function already exists and has to be
    // // removed
    // await diamondCutContract.diamondCut(
    //   [[test1facet.address, FacetCutAction.Add, getSelectors(test1facet.functions).slice(1)]],
    //   '0x0000000000000000000000000000000000000000',
    //   '0x'
    // );
    // r = await diamondLoupe.facetAddresses();
    // console.log(r);

    // // CALLING xtreme FUNCTION OF TEST1FACET
    // const test1facetFactory = await hre.ethers.getContractFactory("Test1Facet");
    // test1facet = await test1facetFactory.attach(gitRepository.address);

    // await test1facet.xtreme(42);
    // r = await test1facet.xtreme2();
    // console.log("A:", r.toString());

    // await test1facet.xtreme(1337);
    // r = await test1facet.xtreme2();
    // console.log(r.toString());

    // // DEPLOY TEST2FACET
    // let test2facet = await deployContract("Test2Facet");
    // await test2facet.deployed();
    // console.log("Test2Facet's address: ", test2facet.address);

    // // we are slicing the result from getSelectors, because supportsInterface function already exists and has to be
    // // removed
    // await diamondCutContract.diamondCut(
    //   [[test2facet.address, FacetCutAction.Add, getSelectors(test2facet.functions).slice(1)]],
    //   '0x0000000000000000000000000000000000000000',
    //   '0x'
    // );
    // r = await diamondLoupe.facetAddresses();
    // console.log(r);

    // const test2facetFactory = await hre.ethers.getContractFactory("Test2Facet");
    // test2facet = await test2facetFactory.attach(gitRepository.address);

    // r = await test2facet.xtreme4A();
    // console.log("A:", r.toString());

    // r = await test2facet.xtreme4B();
    // console.log(r.toString());

    // test2facet.xtreme3B(42);
    // r = await test2facet.xtreme4B();
    // console.log(r.toString());

    // // REPLACE
    // test1facet = await deployContract("Test1FacetReplace");
    // await test1facet.deployed();
    // console.log("Test1FacetReplace's address: ", test1facet.address);

    // // we are slicing the result from getSelectors, because supportsInterface function already exists and has to be
    // // removed
    // await diamondCutContract.diamondCut(
    //   [[test1facet.address, FacetCutAction.Replace, getSelectors(test1facet.functions).slice(1)]],
    //   '0x0000000000000000000000000000000000000000',
    //   '0x'
    // );
    // r = await diamondLoupe.facetAddresses();
    // console.log(r);
    // const test1facetReplaceFactory = await hre.ethers.getContractFactory("Test1FacetReplace");
    // test1facet = await test1facetReplaceFactory.attach(gitRepository.address);

    // r = await test1facet.xtreme2();
    // console.log(">>", r.toString());
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });