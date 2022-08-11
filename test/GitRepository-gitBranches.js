const { expect, assert } = require("chai");
const { waffle } = require("hardhat");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");


describe("Testing Git Branch of Git Repository", function() {
  const repoName = "TestRepo";

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, gitRepositoryManagementFacet, gitRepositoryLocation, diamondCut, gitBranch, gitBranchFactory;

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

    gitRepoContractRegistry = await deployContract("GitRepoContractRegistry",[diamondCut]);
    await gitRepoContractRegistry.deployed();

    gitFactoryContractRegistry = await deployContract("GitFactoryContractRegistry",[diamondCut]);
    await gitFactoryContractRegistry.deployed();

    gitFactory = await deployContract("GitFactory", [
        gitRepoContractRegistry.address,
        gitFactoryContractRegistry.address
    ]);
    await gitFactory.deployed();
    await gitFactory.createRepository(repoName);
    const userRepoNameHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
    gitRepositoryLocation = await gitFactory.getRepository(userRepoNameHash);

    gitBranchFactory = await hre.ethers.getContractFactory("GitBranch");
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

  describe("Testing GitBranch in a forked repository", function() {
    describe("Test getBranch function", function() {
        let repoToBeForked;
        let forkedRepo;
        let branchNames = [
            {name: 'master', cid: 'test123'},
            {name: 'lollipop', cid: 'test1234'}
        ];
        before(async function() {
            const repoName = 'repo_to_be_forked';
            await gitFactory.createRepository(repoName);
            const repositoryLocation = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
            
            let repoLocation = await gitFactory.getRepository(repositoryLocation);
            repoToBeForked = await gitBranchFactory.attach(repoLocation.location);

            await repoToBeForked.push(branchNames[0].name, branchNames[0].cid);
            await repoToBeForked.push(branchNames[1].name, branchNames[1].cid);

            await gitFactory.connect(ACCOUNTS[1]).forkRepository(repositoryLocation);
            const forkedRepositoryLocation = await gitFactory.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
            let forkedRepoLocation = await gitFactory.getRepository(forkedRepositoryLocation);
            forkedRepo = await gitBranchFactory.attach(forkedRepoLocation.location);
        });

        it("Getting branches without pushed new cid for existing branches", async function() {
            let masterBranch = await forkedRepo.getBranch(branchNames[0].name);
            expect(masterBranch.isActive).to.be.true;
            expect(masterBranch.headCid).to.be.equal(branchNames[0].cid);

            let lollipopBranch = await forkedRepo.getBranch(branchNames[1].name);
            expect(lollipopBranch.isActive).to.be.true;
            expect(lollipopBranch.headCid).to.be.equal(branchNames[1].cid);
        });

        it("Pushing new cid to existing branch and get the data", async function() {
            let newHeadCidForMaster = 'test12345';
            await forkedRepo.connect(ACCOUNTS[1]).push(branchNames[0].name, newHeadCidForMaster);

            let masterBranch = await forkedRepo.getBranch(branchNames[0].name);
            expect(masterBranch.isActive).to.be.true;
            expect(masterBranch.headCid).to.be.equal(newHeadCidForMaster);

            let lollipopBranch = await forkedRepo.getBranch(branchNames[1].name);
            expect(lollipopBranch.isActive).to.be.true;
            expect(lollipopBranch.headCid).to.be.equal(branchNames[1].cid);

            let originMasterBranch = await repoToBeForked.getBranch(branchNames[0].name);
            expect(originMasterBranch.isActive).to.be.true;
            expect(originMasterBranch.headCid).to.be.equal(branchNames[0].cid);

        });
    });

    describe("Test calling readRemoteBranchNamesIntoStorage", function() {
        let forkedRepo;

        before(async function() {
            const repoName = 'repo_to_be_forked_2';
            await gitFactory.createRepository(repoName);
            const repositoryLocation = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
            
            let repoLocation = await gitFactory.getRepository(repositoryLocation);
            repoToBeForked = await gitBranchFactory.attach(repoLocation.location);

            await gitFactory.connect(ACCOUNTS[1]).forkRepository(repositoryLocation);
            const forkedRepositoryLocation = await gitFactory.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
            let forkedRepoLocation = await gitFactory.getRepository(forkedRepositoryLocation);
            forkedRepo = await gitBranchFactory.attach(forkedRepoLocation.location);
        });
        it("Try to call readRemoteBranchNamesIntoStorage from non factory", async function() {
            await expect(forkedRepo.readRemoteBranchNamesIntoStorage()).to.be.revertedWith("Only GitFactory can call this function");
        });
    });
  });
});
