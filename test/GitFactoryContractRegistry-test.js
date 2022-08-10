const { expect } = require("chai");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");

describe("Testing GitFactoryContractRegistry", function() {

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitRepositoryManagementFacet, gitRepositoryManagementFacetUpdated;
  let gitFactoryContractRegistry;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    gitRepositoryManagementFacetUpdated = await deployContract("GitRepositoryManagementUpdated");

    await gitRepositoryManagementFacet.deployed();
    await gitRepositoryManagementFacetUpdated.deployed();

    diamondCut = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions)]
      ];
    
    gitFactoryContractRegistry = await deployContract("GitFactoryContractRegistry",[diamondCut]);
    await gitFactoryContractRegistry.deployed();
  });

  describe("Testing GitFactoryContractRegistry settings after deployment", function() {
    it("Should return the default account address as owner of the GitFactoryContractRegistry", async function() {
      expect(await gitFactoryContractRegistry.owner()).to.equal(DEFAULT_ACCOUNT_ADDRESS);
    });

    it("Should return the address of the GitRepositoryManagement contract", async function() {
        const selectors = getSelectors(gitRepositoryManagementFacet.functions);
        for (selector of selectors) {
            expect(await gitFactoryContractRegistry.getContractAddress(selector)).to.equal(gitRepositoryManagementFacet.address);
        }
    });
  });

  describe("Testing adding/updating address in registry", function() {
      it("Trying to add selectors with non-owner account", async function() {
        await expect(gitFactoryContractRegistry.connect(ACCOUNTS[1]).functions.addContractAddress([
            gitRepositoryManagementFacetUpdated.address,
            getSelectors(gitRepositoryManagementFacetUpdated.functions)
        ])).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Trying to add selectors with owner account", async function() {
        await gitFactoryContractRegistry.functions.addContractAddress([
            gitRepositoryManagementFacetUpdated.address,
            getSelectors(gitRepositoryManagementFacetUpdated.functions)
        ]);

        const selectors = getSelectors(gitRepositoryManagementFacetUpdated.functions);
        for (selector of selectors) {
            expect(await gitFactoryContractRegistry.getContractAddress(selector)).to.equal(gitRepositoryManagementFacetUpdated.address);
        }
      });

      it("Testing unavailable selector", async function() {
        await expect(gitFactoryContractRegistry.getContractAddress("0x00000000")).to.be.revertedWith("No contract registered");
      });

      it("Removing selectors", async function() {
        await gitFactoryContractRegistry.functions.removeContractAddress(
            getSelectors(gitRepositoryManagementFacetUpdated.functions)
        );
        for (selector of selectors) {
            await expect(gitFactoryContractRegistry.getContractAddress(selector)).to.be.revertedWith("No contract registered");
        }
      });
  });
});
