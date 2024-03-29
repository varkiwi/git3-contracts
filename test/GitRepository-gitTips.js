const { expect } = require("chai");
const { waffle } = require("hardhat");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");

describe("Testing Git Tips", function() {
  const repoName = "TestRepo";
  const tip = ethers.utils.parseEther("1.0");
  const provider = waffle.provider;

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, gitRepositoryManagementFacet, gitBranchFacet, gitRepositoryLocation, gitTips, gitTipsFactory;
  let diamondCutRepo, diamondCutFactory;
  let repositoryManagementContract, repositoryManagementFacet;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    gitTipsFacet = await deployContract("GitTips");
    gitBranchFacet = await deployContract("GitBranch");
    repositoryManagementFacet = await deployContract("RepositoryManagement");

    await gitRepositoryManagementFacet.deployed();
    await gitTipsFacet.deployed();
    await gitBranchFacet.deployed();
    await repositoryManagementFacet.deployed();

    diamondCutRepo = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions), true],
        [gitTipsFacet.address, getSelectors(gitTipsFacet.functions), false],
        [gitBranchFacet.address, getSelectors(gitBranchFacet.functions), true]
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

    gitTipsFactory = await hre.ethers.getContractFactory("GitTips");
    gitTips = await gitTipsFactory.attach(gitRepositoryLocation.location);
  });

  describe("Testing gitTips of GitRepository", function() {
    describe("Testing collectTips function", function() {
        it("Sending tips to the repository", async function() {
            await ACCOUNTS[1].sendTransaction({
                to: gitRepositoryLocation.location,
                value: tip,
            });
            const tips = await gitTips.getTips();
            await expect(tips.toHexString()).to.be.equal(tip.toHexString());
            
        });

        it("Non-owner tying to collecting tips - fails", async function() {
            await expect(
                gitTips.connect(ACCOUNTS[1]).collectTips())
                .to.be.revertedWith('You are not allowed to perform this action');
            const tips = await gitTips.getTips();
            await expect(tips.toHexString()).to.be.equal(tip.toHexString());
        });

        it("Owner collecting tips", async function() {
            const beforeCollecting = await provider.getBalance(ACCOUNTS[0].address);
            const shouldHave = beforeCollecting.add(tip);
            const tx = await gitTips.collectTips();

            const txReceipt = await tx.wait();
            const txFees = txReceipt.gasUsed.mul(tx.gasPrice);

            const afterCollecting = txFees.add(await provider.getBalance(ACCOUNTS[0].address));
            expect(await gitTips.getTips()).to.be.equal(0);
            expect(afterCollecting).to.be.equal(shouldHave);
        });
    });
  });

  describe("Testing GitIssues of forked GitRepository", function() {
    describe("Testing to use GitIssues facet from a forked repository", function() {
        let forkedIssuesRepo;

        before(async function() {
            const repoName = 'repo_to_be_forked';
            await repositoryManagementContract.createRepository(repoName);
            const repositoryLocation = await repositoryManagementContract.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);

            await repositoryManagementContract.connect(ACCOUNTS[1]).forkRepository(repositoryLocation);
            const forkedRepositoryLocation = await repositoryManagementContract.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
            let forkedRepoLocation = await repositoryManagementContract.getRepository(forkedRepositoryLocation);
            forkedIssuesRepo = await gitTipsFactory.attach(forkedRepoLocation.location);
        });

        it("Calling a GitIssue function results in a revert", async function() {
            await expect(forkedIssuesRepo.collectTips()).to.be.revertedWith("Forked repository does not support this function");;
        });
    });
  });
});
