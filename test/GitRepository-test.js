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
    /**
     * functions of DiamonLoupeFacet to test:
     *  - facets - done
     *  - facetFunctionSelectors - done
     *  - facetAddresses - done
     *  - facetAddress
     *  - supportsInterface
     *  Even there is done, it might be that code coverage exposes more tests to do :)
     */
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
  
});
