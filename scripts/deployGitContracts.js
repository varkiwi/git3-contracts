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
    const gitBranchFacet = await deployContract("GitBranch");
    const gitIssuesFacet = await deployContract("GitIssues");

    await diamondCutFacet.deployed();
    await diamondLoupeFacet.deployed();
    await deployer.deployed();
    await gitRepoManagementFacet.deployed();
    await gitBranchFacet.deployed();
    await gitIssuesFacet.deployed();

    console.log("DiamondCutFacet's address is:", diamondCutFacet.address);
    console.log("DiamondLoupeFacet's address is:", diamondLoupeFacet.address);
    console.log("Deployer's address is:", deployer.address);
    console.log("GitRepoManagementFacet's address is:", gitRepoManagementFacet.address);
    console.log("GitBranchFacet's address is:", gitBranchFacet.address);
    console.log("GitIssuesFacet's address is:", gitIssuesFacet.address);
    

    const diamondCut = [
      [diamondCutFacet.address, FacetCutAction.Add, getSelectors(diamondCutFacet.functions)],
      [diamondLoupeFacet.address, FacetCutAction.Add, getSelectors(diamondLoupeFacet.functions)],
      [gitRepoManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepoManagementFacet.functions)],
      [gitBranchFacet.address, FacetCutAction.Add, getSelectors(gitBranchFacet.functions)],
      [gitIssuesFacet.address, FacetCutAction.Add, getSelectors(gitIssuesFacet.functions)]
    ];


    const gitFactory = await deployContract("GitFactory", [diamondCut, deployer.address]);
    await gitFactory.deployed();
    console.log("GitFactory's address:", gitFactory.address);
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });