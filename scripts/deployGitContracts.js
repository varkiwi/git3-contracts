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
    const gitRepoManagementFacet = await deployContract("GitRepositoryManagement");
    const gitBranchFacet = await deployContract("GitBranch");
    const gitIssuesFacet = await deployContract("GitIssues");
    const gitTipsFacet = await deployContract("GitTips");

    await gitRepoManagementFacet.deployed();
    await gitBranchFacet.deployed();
    await gitIssuesFacet.deployed();
    await gitTipsFacet.deployed();

    console.log("GitRepoManagementFacet's address is:", gitRepoManagementFacet.address);
    console.log("GitBranchFacet's address is:", gitBranchFacet.address);
    console.log("GitIssuesFacet's address is:", gitIssuesFacet.address);
    console.log("GitTipsFacet's address is:", gitTipsFacet.address);
    

    const diamondCut = [
      [gitRepoManagementFacet.address, getSelectors(gitRepoManagementFacet.functions)],
      [gitBranchFacet.address, getSelectors(gitBranchFacet.functions)],
      [gitIssuesFacet.address, getSelectors(gitIssuesFacet.functions)],
      [gitTipsFacet.address, getSelectors(gitTipsFacet.functions)]
    ];

    const gitContractRegistry = await deployContract("GitContractRegistry", [diamondCut, ]);
    await gitContractRegistry.deployed();
    console.log("GitContractRegistry's address is:", gitContractRegistry.address);


    const gitFactory = await deployContract("GitFactory", [gitContractRegistry.address]);
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