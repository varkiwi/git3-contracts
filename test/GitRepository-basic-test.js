const { expect } = require("chai");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");

describe("Testing Git Repository", function() {
  const repoName = "TestRepo";

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, gitRepositoryManagementFacet, gitRepositoryLocation;
  let repositoryManagementContract,repositoryManagementFacet;
  let diamondCutRepo, diamondCutFactory;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    repositoryManagementFacet = await deployContract("RepositoryManagement");

    await gitRepositoryManagementFacet.deployed();
    await repositoryManagementFacet.deployed();

    diamondCutRepo = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions), true]
    ];

    diamondCutFactory = [
        [repositoryManagementFacet.address, getSelectors(repositoryManagementFacet.functions)]
    ];

    gitRepoContractRegistry = await deployContract("GitRepoContractRegistry",[diamondCutRepo]);
    await gitRepoContractRegistry.deployed();

    gitFactoryContractRegistry = await deployContract("GitFactoryContractRegistry",[diamondCutFactory]);
    await gitFactoryContractRegistry.deployed();

    gitFactory = await deployContract("GitFactory", [
        gitRepoContractRegistry.address,
        gitFactoryContractRegistry.address
    ]);
    await gitFactory.deployed();

    repositoryManagementFactory = await hre.ethers.getContractFactory("RepositoryManagement");
    repositoryManagementContract = await repositoryManagementFactory.attach(gitFactory.address);

    await repositoryManagementContract.createRepository(repoName);
    const userRepoNameHash = await repositoryManagementContract.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
    gitRepositoryLocation = await repositoryManagementContract.getRepository(userRepoNameHash);
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
