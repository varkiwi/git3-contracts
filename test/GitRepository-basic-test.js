const { expect, assert } = require("chai");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");
const { FacetCutAction} = require("./utils/facetCutAction");

describe("Testing Git Repository", function() {
  const repoName = "TestRepo";

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, diamondCutFacet, diamondLoupeFacet, gitRepositoryManagementFacet, deployer, gitRepositoryLocation, diamondCut;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    deployer = await deployContract("GitRepositoryDeployer");

    await gitRepositoryManagementFacet.deployed();
    await deployer.deployed();

    diamondCut = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions)]
      ];

    gitContractRegistry = await deployContract("GitContractRegistry",[diamondCut]);
    await gitContractRegistry.deployed();

    gitFactory = await deployContract("GitFactory", [deployer.address, gitContractRegistry.address]);
    await gitFactory.deployed();
    await gitFactory.createRepository(repoName);
    const userRepoNameHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
    gitRepositoryLocation = await gitFactory.getRepository(userRepoNameHash);
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
