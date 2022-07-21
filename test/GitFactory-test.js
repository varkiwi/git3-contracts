const { expect } = require("chai");
const { waffle } = require("hardhat");
const provider = waffle.provider;

const { getDiamondCuts } = require("./utils/getDiamondCuts");
const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");

describe("Testing GitFactory", function() {
  const repoName = "TestRepo";
  const newRepoName = `${repoName}-2`;

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, gitRepositoryManagementFacet, gitBranchFacet, gitBranchFactory;
  let gitContractRegistry;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitBranchFactory = await hre.ethers.getContractFactory("GitBranch");

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    gitBranchFacet = await deployContract("GitBranch");

    await gitRepositoryManagementFacet.deployed();
    await gitBranchFacet.deployed();
    const diamondCut = [];
    
    gitContractRegistry = await deployContract("GitContractRegistry",[diamondCut]);
    await gitContractRegistry.deployed();

    gitFactory = await deployContract("GitFactory", [gitContractRegistry.address]);
    await gitFactory.deployed();
  })

  describe("Testing GitFactory settings after deployment", function() {
    it("Should return the default account address as owner of the GitFactory", async function() {
      expect(await gitFactory.owner()).to.equal(DEFAULT_ACCOUNT_ADDRESS);
    });

    it("Should contain zero facets in the diamondCuts array", async function() {
      const [numberOfEntries, entries] = await getDiamondCuts(gitFactory);
      expect(numberOfEntries).to.equal(0);
    });
  })

  describe("Testing creation of new GitRepository", function() {
    it("Deploy a new GitRepository", async function(){
      await gitFactory.createRepository(repoName);
  
      let repositories = await gitFactory.getRepositoryNames();
      let users = await gitFactory.getRepositoriesUserList(repoName);
  
      expect(repositories[0]).to.equal(repoName);
      expect(repositories.length).to.equal(1);
  
      expect(users[0]).to.equal(DEFAULT_ACCOUNT_ADDRESS);
      expect(users.length).to.equal(1);
    });
  
    it("Deploy the same GitRepository again, which should fail", async function(){
      await expect(gitFactory.createRepository(repoName)).to.be.revertedWith("Repository exists already");

      let repositories = await gitFactory.getRepositoryNames();
      let users = await gitFactory.getRepositoriesUserList(repoName);

      expect(repositories[0]).to.equal(repoName);
      expect(repositories.length).to.equal(1);
  
      expect(users[0]).to.equal(DEFAULT_ACCOUNT_ADDRESS);
      expect(users.length).to.equal(1);
    });

    it("Deploy the same GitRepository again, using different account", async function(){
      await gitFactory.connect(ACCOUNTS[1]).createRepository(repoName);

      let repositories = await gitFactory.getRepositoryNames();
      let users = await gitFactory.getRepositoriesUserList(repoName);
      
      expect(repositories[0]).to.equal(repoName);
      expect(repositories.length).to.equal(1);
  
      expect(users[0]).to.equal(DEFAULT_ACCOUNT_ADDRESS);
      expect(users[1]).to.equal(ACCOUNTS[1].address);
      expect(users.length).to.equal(2);
    });
  });

  describe("Testing GitRepository information functions", function() {

    it("Check registered repository names", async function() {
      const repoNames = await gitFactory.getRepositoryNames();
      expect(repoNames).to.deep.equal([repoName]);
    });

    it("Check owner and users registered GitRepository names", async function(){
      const ownerRepos = await gitFactory.getUsersRepositories(DEFAULT_ACCOUNT_ADDRESS);
      expect(ownerRepos).to.deep.equal([repoName]);

      const userRepos = await gitFactory.getUsersRepositories(ACCOUNTS[1].address);
      expect(userRepos).to.deep.equal([repoName]);
    });

    it("Get users to a repositry name", async function() {
      let users = await gitFactory.getRepositoriesUserList(repoName);
      expect(users).to.deep.equal([DEFAULT_ACCOUNT_ADDRESS, ACCOUNTS[1].address]);
    })
  });

  describe("Test removing GitRepository", function() {
    const repoUserMapping = {};

    beforeEach(async function() {
      let users, userRepoHash, repository;
      const gitRepoFactory = await ethers.getContractFactory("GitRepositoryManagement");

      //before we do the test, we deploy a new repositories, which include the gitRepositoryManagement facet
      const diamondCut = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions, false), true]
      ];

      gitContractRegistry = await deployContract("GitContractRegistry",[diamondCut]);
      await gitContractRegistry.deployed();
  
      gitFactory = await deployContract("GitFactory", [gitContractRegistry.address]);
      await gitFactory.deployed();
      
      await gitFactory.createRepository(repoName);
      await gitFactory.connect(ACCOUNTS[1]).createRepository(repoName);
      await gitFactory.createRepository(newRepoName);

      const repoNames = await gitFactory.getRepositoryNames();
      for (let repo of repoNames) {
        users = await gitFactory.getRepositoriesUserList(repo);
        repoUserMapping[repo] = [];
        for (let user of users) {
          userRepoHash = await gitFactory.getUserRepoNameHash(user, repo);
          repository = await gitFactory.getRepository(userRepoHash);
          repoUserMapping[repo].push(await gitRepoFactory.attach(repository.location));
        }
      }
    });

    it("Trying to delete a repository using a non-owner address", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        gitFactory.connect(ACCOUNTS[1]).removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber(),
          repoInfo.repoIndex.toNumber()
        ))
      .to.be.revertedWith("Repository doesn't exist");
    });

    it("Trying to delete a repository using a owner address but wrong user index parameter", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        gitFactory.removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber() + 1,
          repoInfo.repoIndex.toNumber()
        ))
      .to.be.revertedWith("User Index value is not correct");
    });

    it("Trying to delete a repository using a owner address but wrong repo index parameter", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        gitFactory.removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber(),
          repoInfo.repoIndex.toNumber() + 1
        ))
      .to.be.revertedWith("Repo Index value is not correct");
    });

    it("Trying to delete a repository using a owner address but wrong user and repo index parameter", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        gitFactory.removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber() + 1,
          repoInfo.repoIndex.toNumber() + 1
        ))
      .to.be.revertedWith("User Index value is not correct");
    });

    it("Deleting a repository", async function() {
      // const gitRepoFactory = await ethers.getContractFactory("GitRepositoryManagement");
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await gitFactory.removeRepository(newRepoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      let userRepoHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, newRepoName);
      let repository = await gitFactory.getRepository(userRepoHash);

      expect(repository.isActive).to.be.false;

      const repositoryNames = await gitFactory.getRepositoryNames();
      expect(repositoryNames.length).to.be.equal(1);
      expect(repositoryNames).to.deep.equal(['TestRepo']);
    });

    it("Deleting first two repositories to check if repo index in the second repo in the name list is updated", async function() {
      // deleting first TestRepo owner by default account
      let repoInfo = await repoUserMapping[repoName][0].getRepositoryInfo();
      await gitFactory.removeRepository(repoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      let userRepoHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
      let repository = await gitFactory.getRepository(userRepoHash);

      expect(repository.isActive).to.be.false;

      // deleting second TestRepo owner by another account
      repoInfo = await repoUserMapping[repoName][1].getRepositoryInfo();
      await gitFactory.connect(ACCOUNTS[1]).removeRepository(repoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      userRepoHash = await gitFactory.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
      repository = await gitFactory.getRepository(userRepoHash);

      expect(repository.isActive).to.be.false;

      // checking if the names list is correctly updated
      const repositoryNames = await gitFactory.getRepositoryNames();
      expect(repositoryNames.length).to.be.equal(1);
      expect(repositoryNames).to.deep.equal(['TestRepo-2']);

      repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
      expect(repoInfo.repoIndex.toNumber()).to.be.equal(0);
    });

    it("Deleting repo of default user so that user index of second users is updated", async function() {
      const gitRepoFactory = await ethers.getContractFactory("GitRepositoryManagement");
      const userRepoHash = await gitFactory.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
      const repository = await gitFactory.getRepository(userRepoHash);
      const repo = await gitRepoFactory.attach(repository.location);
      let repoInfo = await repo.getRepositoryInfo();
      
      expect(repoInfo.userIndex.toNumber()).to.be.equal(1);
      // deleting first TestRepo owner by default account
      repoInfo = await repoUserMapping[repoName][0].getRepositoryInfo();
      await gitFactory.removeRepository(repoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      const users = await gitFactory.getRepositoriesUserList(repoName);
      expect(users.length).to.be.equal(1);
      expect(users).to.deep.equal([ACCOUNTS[1].address]);

      repoInfo = await repo.getRepositoryInfo();
      expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
    });
  });

  describe("Test sending and collecting tips", function() {
    it("Send ether to gitFactory", async function() {
      const userBalance = await provider.getBalance(DEFAULT_ACCOUNT_ADDRESS);
      const tip = ethers.BigNumber.from(1337);
      let tx = {
        to: gitFactory.address,
        value: tip.toNumber()
      }
      let receipt = await ACCOUNTS[0].sendTransaction(tx);

      const factoryBalance = await provider.getBalance(gitFactory.address);
      const newUserBalance = await provider.getBalance(DEFAULT_ACCOUNT_ADDRESS);
      const txReceipt = await provider.getTransactionReceipt(receipt.hash);

      expect(factoryBalance).to.be.equal(tip);
      // calculating the used ether for sending the tip and tx costs
      const expectedBalance = userBalance.sub(receipt.gasPrice.mul(txReceipt.cumulativeGasUsed)).sub(tip);
      expect(newUserBalance).to.be.equal(expectedBalance);
    });

    it("Collect tips using a non-owner account", async function() {
      await expect(gitFactory.connect(ACCOUNTS[1]).collectTips()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Collect tips as owner", async function() {
      const userBalance = await provider.getBalance(DEFAULT_ACCOUNT_ADDRESS);
      const receipt = await gitFactory.collectTips();
      const newUserBalance = await provider.getBalance(DEFAULT_ACCOUNT_ADDRESS);
      const txReceipt = await provider.getTransactionReceipt(receipt.hash);

      const expectedBalance = userBalance.sub(receipt.gasPrice.mul(txReceipt.cumulativeGasUsed)).add(ethers.BigNumber.from(1337));
      expect(expectedBalance).to.be.equal(newUserBalance);
    });
  });

  describe("Testing Ownable functions", function() {
    it("Test transferOwnership function", async function() {
      const currentOwner = await gitFactory.owner();
      const newOwner = ACCOUNTS[1].address;
      await gitFactory.transferOwnership(newOwner);
      expect(await gitFactory.owner()).to.be.equal(newOwner);
      //switching back to the previous owner :)
      await gitFactory.connect(ACCOUNTS[1]).transferOwnership(currentOwner);
    });

    it("Testing that non-owner is not able to transfer ownership", async function() {
      const newOwner = ACCOUNTS[1].address;
      await expect(gitFactory.connect(ACCOUNTS[1]).transferOwnership(newOwner)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Testing that zero address is rejected", async function() {
      await expect(gitFactory.transferOwnership(zeroAddress)).to.be.revertedWith("Ownable: new owner is the zero address");
    });

    it("Testing that renounceOwnership function can't be called by non-owner address", async function() {
      await expect(gitFactory.connect(ACCOUNTS[1]).renounceOwnership()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Testing that renounceOwnership function can be called by owner", async function() {
      await gitFactory.renounceOwnership();
      await expect(await gitFactory.owner()).to.be.equal(zeroAddress);
    });
  });

  describe("Testing forking of repository", function() {

    before(async function() {
        await gitContractRegistry.addContractAddress([
            gitRepositoryManagementFacet.address,
            getSelectors(gitRepositoryManagementFacet.functions, false),
            true
        ]);

        await gitContractRegistry.addContractAddress([
            gitBranchFacet.address,
            getSelectors(gitBranchFacet.functions, false),
            true
        ]);
    });

    it("Forking repository as owner fails", async function() {
        let repositories = await gitFactory.getRepositoryNames();
        let users = await gitFactory.getRepositoriesUserList(repositories[0]);
        const repositoryLocation = await gitFactory.getUserRepoNameHash(users[0], repositories[0]);
        await expect(gitFactory.connect(ACCOUNTS[1]).forkRepository(repositoryLocation)).to.be.revertedWith("Forking not possible. Repository exists already");
    });

    it("Forking repository successful", async function() {
        const gitRepoManagement = await ethers.getContractFactory("GitRepositoryManagement");

        let repositories = await gitFactory.getRepositoryNames();
        let users = await gitFactory.getRepositoriesUserList(repositories[0]);
        const repositoryLocation = await gitFactory.getUserRepoNameHash(users[0], repositories[0]);

        const originRepository = await gitFactory.getRepository(repositoryLocation);
        const gitOrigin = await gitBranchFactory.attach(originRepository.location);

        await gitOrigin.connect(ACCOUNTS[1]).push('master', 'Test123');
        await gitOrigin.connect(ACCOUNTS[1]).push('doodle', 'Test123');

        await gitFactory.forkRepository(repositoryLocation);

        users = await gitFactory.getRepositoriesUserList(repositories[0]);
        const forkedRepositoryLocation = await gitFactory.getUserRepoNameHash(users[1], repositories[0]);
        
        const repository = await gitFactory.getRepository(forkedRepositoryLocation);
        const repo = await gitRepoManagement.attach(repository.location);
        let repoInfo = await repo.getRepositoryInfo();

        const gitFork = gitBranchFactory.attach(repository.location);
        expect(repoInfo.forked).to.be.true;
        expect(repoInfo.forkOrigin).to.be.equal(originRepository.location);
        expect(await gitFork.getBranchNames()).to.be.deep.equal(await gitOrigin.getBranchNames());
    });
  });
});
