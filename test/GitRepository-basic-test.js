const { expect, assert } = require("chai");
const web3Abi = require("web3-eth-abi");
const { waffle } = require("hardhat");
const provider = waffle.provider;

const { getDiamondCuts } = require("./utils/getDiamondCuts");

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
  const contractFactory = await ethers.getContractFactory(contractName);
  let contractInstance;
  if (args !== undefined) {
    contractInstance = await contractFactory.deploy(...args);
  } else {
    contractInstance = await contractFactory.deploy();
  }
  return contractInstance;
}

describe("Testing Git Repository", function() {
  const repoName = "TestRepo";
  const newRepoName = `${repoName}-2`;

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, diamondCutFacet, diamondLoupeFacet, gitRepositoryManagementFacet, deployer, gitRepositoryLocation, diamondCut;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    diamondCutFacet = await deployContract("DiamondCutFacet");
    diamondLoupeFacet = await deployContract("DiamondLoupeFacet");
    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    deployer = await deployContract("Deployer");

    await diamondCutFacet.deployed();
    await diamondLoupeFacet.deployed();
    await gitRepositoryManagementFacet.deployed();
    await deployer.deployed();

    diamondCut = [
      [diamondCutFacet.address, FacetCutAction.Add, getSelectors(diamondCutFacet.functions)],
      [diamondLoupeFacet.address, FacetCutAction.Add, getSelectors(diamondLoupeFacet.functions)],
      [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)]
    ];

    gitFactory = await deployContract("GitFactory", [diamondCut, deployer.address]);
    await gitFactory.deployed();
    await gitFactory.createRepository(repoName);
    const userRepoNameHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
    gitRepositoryLocation = await gitFactory.getRepository(userRepoNameHash);
  });

  describe("Testing DiamondLoupeFacet of GitRepository", function(){
    describe("Testing facets function", function(){
      it("Verifying that address of DiamondLoup contract is equal", async function(){
        const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
        const diamondLoupe = await diamondLoupeFactory.attach(gitRepositoryLocation.location);
        const facets = await diamondLoupe.facets();

        expect(facets.length).to.be.equal(3);
        expect(facets[1].facetAddress).to.be.equal(diamondLoupeFacet.address);
      });
    });
    
    describe("Testing facetFunctionSelectors", function(){
      it("Verifying that returned facets are correct", async function(){
        const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
        const diamondLoupe = await diamondLoupeFactory.attach(gitRepositoryLocation.location);

        const facets = await diamondLoupe.facets();

        for(let facet of facets) {
          fctSelector = await diamondLoupe.facetFunctionSelectors(facet.facetAddress);

          if (facet.facetAddress === diamondCutFacet.address) {
            expect(fctSelector).to.deep.equal(getSelectors(diamondCutFacet.functions));
          } else if (facet.facetAddress === diamondLoupeFacet.address) {
            expect(fctSelector).to.deep.equal(getSelectors(diamondLoupeFacet.functions));
          } else if (facet.facetAddress === gitRepositoryManagementFacet.address) {
            expect(fctSelector).to.deep.equal(getSelectors(gitRepositoryManagementFacet.functions));
          } else {
            assert.fail(`Unknown facet with address ${facet.facetAddress}`);
          }
        }
      });
    });

    describe("Testing facetAddresses function", function(){
      it("Verifying that we get the correct number of facet addresses", async function() {
        const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
        const diamondLoupe = await diamondLoupeFactory.attach(gitRepositoryLocation.location);

        const facetAddresses = await diamondLoupe.facetAddresses();

        expect(facetAddresses.length).to.be.equal(3);
        let addresses = [];

        for(let facet of diamondCut) {
          addresses.push(facet[0]);
        };
        expect(addresses).to.deep.equal(facetAddresses);
      });
    });

    describe("Testing facetAddress function", function() {
      it("Verifying that facetAddress matches to address", async function() {
        const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
        const diamondLoupe = await diamondLoupeFactory.attach(gitRepositoryLocation.location);
        let address;
        for(let facet of diamondCut) {
          for(let fctSelector of facet[2]){
            address = await diamondLoupe.facetAddress(fctSelector);
            expect(address).to.be.equal(facet[0]);
          };
        };
      });
    });
  });
  
  describe("Testing DiamondCutFacet of GitRepository", function(){
    describe("Testing diamondCut function", function(){
      it("Verifying that DiamondCutFacet doesn't allow owner to add facets", async function(){
        const diamondCutFactory = await hre.ethers.getContractFactory("DiamondCutFacet");
        const diamondCut = await diamondCutFactory.attach(gitRepositoryLocation.location);

        //TODO: have to change to a different contract, since Greeter is going to be removed from the repo!
        let test1facetFacet = await deployContract("Greeter", ['Hello']);
        await test1facetFacet.deployed();
        diamondCutParam = [
          [test1facetFacet.address, FacetCutAction.Add, getSelectors(test1facetFacet.functions)]
        ];

        await expect(diamondCut.diamondCut(
          diamondCutParam,
          "0x0000000000000000000000000000000000000000",
          "0x"
        )).to.be.revertedWith("LibD: Must be factory");
      });

      it("Verifying that DiamondCutFacet doesn't allow non-owner to add facets", async function(){
        const diamondCutFactory = await hre.ethers.getContractFactory("DiamondCutFacet");
        const diamondCut = await diamondCutFactory.attach(gitRepositoryLocation.location);

        //TODO: have to change to a different contract, since Greeter is going to be removed from the repo!
        let test1facetFacet = await deployContract("Greeter", ['Hello']);
        await test1facetFacet.deployed();
        diamondCutParam = [
          [test1facetFacet.address, FacetCutAction.Add, getSelectors(test1facetFacet.functions)]
        ];

        await expect(diamondCut.connect(ACCOUNTS[1]).diamondCut(
          diamondCutParam,
          "0x0000000000000000000000000000000000000000",
          "0x"
        )).to.be.revertedWith("LibD: Must be factory");
      });

      //TODO: Add tests for add, replace and remove!
    });
  });

  describe("Testing GitRepositoryManagement of GitRepository", function(){
    describe("Testing getRepositoryInfo function", function(){
      it("Verifying that getRepositoryInfo returns correct information", async function(){
        const gitRepoManagementFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
        const gitRepoManagement = await gitRepoManagementFactory.attach(gitRepositoryLocation.location);
        const repoInfo = await gitRepoManagement.getRepositoryInfo();

        expect(repoInfo.name).to.be.equal(repoName);
        expect(repoInfo.factory).to.be.equal(gitFactory.address);
        expect(repoInfo.contractOwner).to.be.equal(DEFAULT_ACCOUNT_ADDRESS);
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
        expect(repoInfo.repoIndex.toNumber()).to.be.equal(0);
      });

      it("Verifying that getRepositoryInfo returns correct information using non owner account", async function(){
        const gitRepoManagementFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
        const gitRepoManagement = await gitRepoManagementFactory.attach(gitRepositoryLocation.location);
        const repoInfo = await gitRepoManagement.connect(ACCOUNTS[1]).getRepositoryInfo();

        expect(repoInfo.name).to.be.equal(repoName);
        expect(repoInfo.factory).to.be.equal(gitFactory.address);
        expect(repoInfo.contractOwner).to.be.equal(DEFAULT_ACCOUNT_ADDRESS);
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
        expect(repoInfo.repoIndex.toNumber()).to.be.equal(0);
      });
    });

    describe("Testing updateUserIndex function", function(){
      it("Owner trying to updating user index", async function(){
        const gitRepoManagementFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
        const gitRepoManagement = await gitRepoManagementFactory.attach(gitRepositoryLocation.location);
        let repoInfo = await gitRepoManagement.getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);

        await expect(gitRepoManagement.updateUserIndex(2)).to.be.revertedWith("You are not allowd to perform this action");
        repoInfo = await gitRepoManagement.getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
      });

      it("Non-Owner trying to update user index", async function(){
        const gitRepoManagementFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
        const gitRepoManagement = await gitRepoManagementFactory.attach(gitRepositoryLocation.location);
        let repoInfo = await gitRepoManagement.connect(ACCOUNTS[1]).getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);

        await expect(gitRepoManagement.connect(ACCOUNTS[1]).updateUserIndex(2)).to.be.revertedWith("You are not allowd to perform this action");
        repoInfo = await gitRepoManagement.connect(ACCOUNTS[1]).getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
      });
    });

    describe("Testing updateRepoIndex function", function(){
      it("Owner trying to updating repo index", async function(){
        const gitRepoManagementFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
        const gitRepoManagement = await gitRepoManagementFactory.attach(gitRepositoryLocation.location);
        let repoInfo = await gitRepoManagement.getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);

        await expect(gitRepoManagement.updateRepoIndex(2)).to.be.revertedWith("You are not allowd to perform this action");
        repoInfo = await gitRepoManagement.getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
      });

      it("Non-Owner trying to update repo index", async function(){
        const gitRepoManagementFactory = await hre.ethers.getContractFactory("GitRepositoryManagement");
        const gitRepoManagement = await gitRepoManagementFactory.attach(gitRepositoryLocation.location);
        let repoInfo = await gitRepoManagement.connect(ACCOUNTS[1]).getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);

        await expect(gitRepoManagement.connect(ACCOUNTS[1]).updateRepoIndex(2)).to.be.revertedWith("You are not allowd to perform this action");
        repoInfo = await gitRepoManagement.connect(ACCOUNTS[1]).getRepositoryInfo();
        expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
      });
    });
  });
});
