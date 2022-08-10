const { expect } = require("chai");
const { waffle } = require("hardhat");
const provider = waffle.provider;

const { getDiamondCuts } = require("./utils/getDiamondCuts");
const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");

describe("Testing GitRepoContractRegistry", function() {

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitRepositoryManagementFacet, gitRepositoryManagementFacetUpdated;
  let gitRepoContractRegistry;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    gitRepositoryManagementFacetUpdated = await deployContract("GitRepositoryManagementUpdated");

    await gitRepositoryManagementFacet.deployed();
    await gitRepositoryManagementFacetUpdated.deployed();

    diamondCut = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions), true]
      ];
    
    gitRepoContractRegistry = await deployContract("GitRepoContractRegistry",[diamondCut]);
    await gitRepoContractRegistry.deployed();
  });

  describe("Testing GitRepoContractRegistry settings after deployment", function() {
    it("Should return the default account address as owner of the GitRepoContractRegistry", async function() {
      expect(await gitRepoContractRegistry.owner()).to.equal(DEFAULT_ACCOUNT_ADDRESS);
    });

    it("Should return the address of the GitRepositoryManagement contract", async function() {
        const selectors = getSelectors(gitRepositoryManagementFacet.functions);
        for (selector of selectors) {
            expect(await gitRepoContractRegistry.getContractAddress(selector, false)).to.equal(gitRepositoryManagementFacet.address);
        }
    });
  });

  describe("Testing adding/updating address in registry", function() {
      it("Trying to add selectors with non-owner account", async function() {
        await expect(gitRepoContractRegistry.connect(ACCOUNTS[1]).functions.addContractAddress([
            gitRepositoryManagementFacetUpdated.address,
            getSelectors(gitRepositoryManagementFacetUpdated.functions),
            true
        ])).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Trying to add selectors with owner account", async function() {
        await gitRepoContractRegistry.functions.addContractAddress([
            gitRepositoryManagementFacetUpdated.address,
            getSelectors(gitRepositoryManagementFacetUpdated.functions),
            true
        ]);

        const selectors = getSelectors(gitRepositoryManagementFacetUpdated.functions);
        for (selector of selectors) {
            expect(await gitRepoContractRegistry.getContractAddress(selector, false)).to.equal(gitRepositoryManagementFacetUpdated.address);
        }
      });

      it("Testing unavailable selector", async function() {
        await expect(gitRepoContractRegistry.getContractAddress("0x00000000", false)).to.be.revertedWith("No contract registered");
      });

      it("Removing selectors", async function() {
        await gitRepoContractRegistry.functions.removeContractAddress(
            getSelectors(gitRepositoryManagementFacetUpdated.functions)
        );
        for (selector of selectors) {
            await expect(gitRepoContractRegistry.getContractAddress(selector, false)).to.be.revertedWith("No contract registered");
        }
      });
  });
});
