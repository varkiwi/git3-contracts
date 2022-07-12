const { expect, assert } = require("chai");
const { waffle } = require("hardhat");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");


describe("Testing Git Branch of Git Repository", function() {
  const repoName = "TestRepo";

//   const provider = waffle.provider;

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, gitRepositoryManagementFacet, gitRepositoryLocation, diamondCut, gitBranch;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    gitBranchFacet = await deployContract("GitBranch");

    await gitRepositoryManagementFacet.deployed();
    await gitBranchFacet.deployed();

    diamondCut = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions), true],
        [gitBranchFacet.address, getSelectors(gitBranchFacet.functions), true]
      ];

    gitContractRegistry = await deployContract("GitContractRegistry",[diamondCut]);
    await gitContractRegistry.deployed();

    gitFactory = await deployContract("GitFactory", [gitContractRegistry.address]);
    await gitFactory.deployed();
    await gitFactory.createRepository(repoName);
    const userRepoNameHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
    gitRepositoryLocation = await gitFactory.getRepository(userRepoNameHash);

    const gitBranchFactory = await hre.ethers.getContractFactory("GitBranch");
    gitBranch = await gitBranchFactory.attach(gitRepositoryLocation.location);
  });

  describe("Testing GitBranch of GitRepository", function() {
    describe("Testing push function", function() {
      it("Pushing with a zero lenght branch name", async function() {
        await expect(gitBranch.push('', 'TestCid')).to.be.revertedWith("No branch name provided");
      });

      it("Pushing with a zero lenght cid", async function() {
        await expect(gitBranch.push('BranchName', '')).to.be.revertedWith("No CID provided");
      });

      it("Pushing using a different account than owner", async function() {
        await expect(gitBranch.connect(ACCOUNTS[1]).push('BranchName', 'Test123')).to.be.revertedWith("Only owner of repository is able to push");
      });

      it("Pushing to an non-existent branch", async function() {
        let branches = await gitBranch.getBranchNames();
        expect(branches.length).to.be.equal(0);

        await gitBranch.push('master', 'Test123');

        branches = await gitBranch.getBranchNames();
        expect(branches.length).to.be.equal(1);
        expect(branches).deep.equal(['master']);

        masterBranch = await gitBranch.getBranch('master');
        expect(masterBranch.isActive).to.be.true;
        expect(masterBranch.headCid).to.be.equal('Test123');
      });

      it("Pushing to an existent branch", async function() {
        let branches = await gitBranch.getBranchNames();
        expect(branches.length).to.be.equal(1);
        expect(branches).deep.equal(['master']);

        await gitBranch.push('master', 'Test1234');

        branches = await gitBranch.getBranchNames();
        expect(branches.length).to.be.equal(1);
        expect(branches).deep.equal(['master']);

        masterBranch = await gitBranch.getBranch('master');
        expect(masterBranch.isActive).to.be.true;
        expect(masterBranch.headCid).to.be.equal('Test1234');
      });
    });
  });
});
