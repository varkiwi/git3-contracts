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
  let repositoryManagementContract, gitFactoryTipsContract;
  let gitRepoContractRegistry, gitFactoryContractRegistry;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    gitBranchFactory = await hre.ethers.getContractFactory("GitBranch");

    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    gitBranchFacet = await deployContract("GitBranch");

    createRepositoryFacet = await deployContract("RepositoryManagement");
    gitFactoryTips = await deployContract("GitFactoryTips");

    await gitRepositoryManagementFacet.deployed();
    await gitBranchFacet.deployed();
    await createRepositoryFacet.deployed();

    const diamondCutRepo = [];
    
    const diamondCutFactory = [
        [createRepositoryFacet.address, getSelectors(createRepositoryFacet.functions)],
        [gitFactoryTips.address, getSelectors(gitFactoryTips.functions)]
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

    gitFactoryTipsFactory = await hre.ethers.getContractFactory("GitFactoryTips");
    gitFactoryTipsContract = await gitFactoryTipsFactory.attach(gitFactory.address);

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
      await repositoryManagementContract.createRepository(repoName);
  
      let repositories = await repositoryManagementContract.getRepositoryNames();
      let users = await repositoryManagementContract.getRepositoriesUserList(repoName);
  
      expect(repositories[0]).to.equal(repoName);
      expect(repositories.length).to.equal(1);
  
      expect(users[0]).to.equal(DEFAULT_ACCOUNT_ADDRESS);
      expect(users.length).to.equal(1);
    });
  
    it("Deploy the same GitRepository again, which should fail", async function(){
      await expect(repositoryManagementContract.createRepository(repoName)).to.be.revertedWith("Repository exists");

      let repositories = await repositoryManagementContract.getRepositoryNames();
      let users = await repositoryManagementContract.getRepositoriesUserList(repoName);

      expect(repositories[0]).to.equal(repoName);
      expect(repositories.length).to.equal(1);
  
      expect(users[0]).to.equal(DEFAULT_ACCOUNT_ADDRESS);
      expect(users.length).to.equal(1);
    });

    it("Deploy the same GitRepository again, using different account", async function(){
      await repositoryManagementContract.connect(ACCOUNTS[1]).createRepository(repoName);

      let repositories = await repositoryManagementContract.getRepositoryNames();
      let users = await repositoryManagementContract.getRepositoriesUserList(repoName);
      
      expect(repositories[0]).to.equal(repoName);
      expect(repositories.length).to.equal(1);
  
      expect(users[0]).to.equal(DEFAULT_ACCOUNT_ADDRESS);
      expect(users[1]).to.equal(ACCOUNTS[1].address);
      expect(users.length).to.equal(2);
    });
  });

  describe("Testing GitRepository information functions", function() {

    it("Check registered repository names", async function() {
      const repoNames = await repositoryManagementContract.getRepositoryNames();
      expect(repoNames).to.deep.equal([repoName]);
    });

    it("Check owner and users registered GitRepository names", async function(){
      const ownerRepos = await repositoryManagementContract.getUsersRepositories(DEFAULT_ACCOUNT_ADDRESS);
      expect(ownerRepos).to.deep.equal([repoName]);

      const userRepos = await repositoryManagementContract.getUsersRepositories(ACCOUNTS[1].address);
      expect(userRepos).to.deep.equal([repoName]);
    });

    it("Get users to a repository name", async function() {
      let users = await repositoryManagementContract.getRepositoriesUserList(repoName);
      expect(users).to.deep.equal([DEFAULT_ACCOUNT_ADDRESS, ACCOUNTS[1].address]);
    })
  });

  describe("Test removing GitRepository", function() {
    const repoUserMapping = {};

    beforeEach(async function() {
      let users, userRepoHash, repository;
      const gitRepoFactory = await ethers.getContractFactory("GitRepositoryManagement");
      
      createRepositoryFacet = await deployContract("RepositoryManagement");
      gitFactoryTips = await deployContract("GitFactoryTips");
      await createRepositoryFacet.deployed();
      await gitFactoryTips.deployed();
      
      //before we do the test, we deploy a new repositories, which include the gitRepositoryManagement facet
      const diamondCutRepo = [
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions), true]
      ];

      const diamondCutFactory = [
        [createRepositoryFacet.address, getSelectors(createRepositoryFacet.functions)],
        [gitFactoryTips.address, getSelectors(gitFactoryTips.functions)]
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

      gitFactoryTipsFactory = await hre.ethers.getContractFactory("GitFactoryTips");
      gitFactoryTipsContract = await gitFactoryTipsFactory.attach(gitFactory.address);

      await repositoryManagementContract.createRepository(repoName);
      await repositoryManagementContract.connect(ACCOUNTS[1]).createRepository(repoName);
      await repositoryManagementContract.createRepository(newRepoName);

      const repoNames = await repositoryManagementContract.getRepositoryNames();
      
      for (let repo of repoNames) {
        users = await repositoryManagementContract.getRepositoriesUserList(repo);
        repoUserMapping[repo] = [];
        for (let user of users) {
          userRepoHash = await repositoryManagementContract.getUserRepoNameHash(user, repo);
          repository = await repositoryManagementContract.getRepository(userRepoHash);
          repoUserMapping[repo].push(await gitRepoFactory.attach(repository.location));
        }
      }
    });

    it("Trying to delete a repository using a non-owner address", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        repositoryManagementContract.connect(ACCOUNTS[1]).removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber(),
          repoInfo.repoIndex.toNumber()
        ))
      .to.be.revertedWith("Repository doesn't exist");
    });

    it("Trying to delete a repository using a owner address but wrong user index parameter", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        repositoryManagementContract.removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber() + 1,
          repoInfo.repoIndex.toNumber()
        ))
      .to.be.revertedWith("User Index value is incorrect");
    });

    it("Trying to delete a repository using a owner address but wrong repo index parameter", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        repositoryManagementContract.removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber(),
          repoInfo.repoIndex.toNumber() + 1
        ))
      .to.be.revertedWith("Repo Index value is incorrect");
    });

    it("Trying to delete a repository using a owner address but wrong user and repo index parameter", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await expect(
        repositoryManagementContract.removeRepository(
          newRepoName, 
          repoInfo.userIndex.toNumber() + 1,
          repoInfo.repoIndex.toNumber() + 1
        ))
      .to.be.revertedWith("User Index value is incorrect");
    });

    it("Deleting a repository", async function() {
      const repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      await repositoryManagementContract.removeRepository(newRepoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      let userRepoHash = await repositoryManagementContract.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, newRepoName);
      let repository = await repositoryManagementContract.getRepository(userRepoHash);

      expect(repository.isActive).to.be.false;

      const repositoryNames = await repositoryManagementContract.getRepositoryNames();
      expect(repositoryNames.length).to.be.equal(1);
      expect(repositoryNames).to.deep.equal(['TestRepo']);
    });

    it("Deleting first two repositories to check if repo index in the second repo in the name list is updated", async function() {
      let repoInfo = await repoUserMapping[repoName][0].getRepositoryInfo();
      await repositoryManagementContract.removeRepository(repoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      let userRepoHash = await repositoryManagementContract.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
      let repository = await repositoryManagementContract.getRepository(userRepoHash);

      expect(repository.isActive).to.be.false;

      // deleting second TestRepo owner by another account
      repoInfo = await repoUserMapping[repoName][1].getRepositoryInfo();
      await repositoryManagementContract.connect(ACCOUNTS[1]).removeRepository(repoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      userRepoHash = await repositoryManagementContract.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
      repository = await repositoryManagementContract.getRepository(userRepoHash);

      expect(repository.isActive).to.be.false;

      // checking if the names list is correctly updated
      const repositoryNames = await repositoryManagementContract.getRepositoryNames();
      expect(repositoryNames.length).to.be.equal(1);
      expect(repositoryNames).to.deep.equal(['TestRepo-2']);

      repoInfo = await repoUserMapping[newRepoName][0].getRepositoryInfo();
      expect(repoInfo.userIndex.toNumber()).to.be.equal(0);
      expect(repoInfo.repoIndex.toNumber()).to.be.equal(0);
    });

    it("Deleting repo of default user so that user index of second users is updated", async function() {
      const gitRepoFactory = await ethers.getContractFactory("GitRepositoryManagement");
      const userRepoHash = await repositoryManagementContract.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
      const repository = await repositoryManagementContract.getRepository(userRepoHash);
      const repo = await gitRepoFactory.attach(repository.location);
      let repoInfo = await repo.getRepositoryInfo();
      
      expect(repoInfo.userIndex.toNumber()).to.be.equal(1);
      // deleting first TestRepo owner by default account
      repoInfo = await repoUserMapping[repoName][0].getRepositoryInfo();
      await repositoryManagementContract.removeRepository(repoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      const users = await repositoryManagementContract.getRepositoriesUserList(repoName);
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
      await expect(gitFactoryTipsContract.connect(ACCOUNTS[1]).collectTips()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Collect tips as owner", async function() {
      const userBalance = await provider.getBalance(DEFAULT_ACCOUNT_ADDRESS);

      const receipt = await gitFactoryTipsContract.collectTips();
      const newUserBalance = await provider.getBalance(DEFAULT_ACCOUNT_ADDRESS);
      const txReceipt = await provider.getTransactionReceipt(receipt.hash);

      const expectedBalance = userBalance.sub(receipt.gasPrice.mul(txReceipt.cumulativeGasUsed)).add(ethers.BigNumber.from(1337));
      expect(expectedBalance).to.be.equal(newUserBalance);

      const factoryBalance = await provider.getBalance(gitFactory.address);
      expect(factoryBalance).to.be.equal(0);
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
        await gitRepoContractRegistry.addContractAddress([
            gitRepositoryManagementFacet.address,
            getSelectors(gitRepositoryManagementFacet.functions, false),
            true
        ]);

        await gitRepoContractRegistry.addContractAddress([
            gitBranchFacet.address,
            getSelectors(gitBranchFacet.functions, false),
            true
        ]);
    });

    it("Forking repository as owner fails", async function() {
        let repositories = await repositoryManagementContract.getRepositoryNames();
        let users = await repositoryManagementContract.getRepositoriesUserList(repositories[0]);
        const repositoryLocation = await repositoryManagementContract.getUserRepoNameHash(users[0], repositories[0]);
        await expect(repositoryManagementContract.connect(ACCOUNTS[1]).forkRepository(repositoryLocation)).to.be.revertedWith("Forking impossible. Repository exists already");
    });

    it("Forking repository successful", async function() {
        const gitRepoManagement = await ethers.getContractFactory("GitRepositoryManagement");

        let repositories = await repositoryManagementContract.getRepositoryNames();
        let users = await repositoryManagementContract.getRepositoriesUserList(repositories[0]);
        const repositoryLocation = await repositoryManagementContract.getUserRepoNameHash(users[0], repositories[0]);

        const originRepository = await repositoryManagementContract.getRepository(repositoryLocation);
        const gitOrigin = await gitBranchFactory.attach(originRepository.location);

        await gitOrigin.connect(ACCOUNTS[1]).push('master', 'Test123');
        await gitOrigin.connect(ACCOUNTS[1]).push('doodle', 'Test123');

        await repositoryManagementContract.forkRepository(repositoryLocation);

        users = await repositoryManagementContract.getRepositoriesUserList(repositories[0]);
        const forkedRepositoryLocation = await repositoryManagementContract.getUserRepoNameHash(users[1], repositories[0]);
        
        const repository = await repositoryManagementContract.getRepository(forkedRepositoryLocation);
        const repo = await gitRepoManagement.attach(repository.location);
        let repoInfo = await repo.getRepositoryInfo();

        const gitFork = gitBranchFactory.attach(repository.location);
        expect(repoInfo.forked).to.be.true;
        expect(repoInfo.forkOrigin).to.be.equal(originRepository.location);
        expect(await gitFork.getBranchNames()).to.be.deep.equal(await gitOrigin.getBranchNames());
    });
  });
});
