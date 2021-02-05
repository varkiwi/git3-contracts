const { expect } = require("chai");
const web3Abi = require("web3-eth-abi");
const { waffle } = require("hardhat");
const provider = waffle.provider;

const { getDiamondCuts } = require("./utils/getDiamondCuts");

const FacetCutAction = {
  Add: 0,
  Replace: 1,
  Remove: 2
}

function getSelectors(contractFunctions, output=false) {
  selectors = [];
  for (func in contractFunctions) {
    // we have to add the c_0x part for the solidity-coverage plugin, since it instruments the code and adds a function
    // starting with c_0x and random hex values
    if (func.includes('(') && !func.includes('c_0x')) {
      if(output) {
        console.log('func', func);
      }
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

describe("Testing GitFactory", function() {
  const repoName = "TestRepo";
  const newRepoName = `${repoName}-2`;

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, diamondCutFacet, diamondLoupeFacet, gitRepositoryManagementFacet, deployer;

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

    const diamondCut = [
      [diamondCutFacet.address, FacetCutAction.Add, getSelectors(diamondCutFacet.functions)],
      [diamondLoupeFacet.address, FacetCutAction.Add, getSelectors(diamondLoupeFacet.functions)]
    ];

    gitFactory = await deployContract("GitFactory", [diamondCut, deployer.address]);
    await gitFactory.deployed();
  })

  describe("Testing GitFactory settings after deployment", function() {
    it("Should return the default account address as owner of the GitFactory", async function() {
      expect(await gitFactory.owner()).to.equal(DEFAULT_ACCOUNT_ADDRESS);
    });

    it("Should contain two facets in the diamondCuts array", async function() {
      const [numberOfEntries, entries] = await getDiamondCuts(gitFactory);
      expect(numberOfEntries).to.equal(2);
  
      expect(entries[0].facetAddress).to.equal(diamondCutFacet.address);
      expect(entries[0].action).to.equal(FacetCutAction.Add);
  
      expect(entries[1].facetAddress).to.equal(diamondLoupeFacet.address);
      expect(entries[1].action).to.equal(FacetCutAction.Add);
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
  })

  describe("Testing facets", async function() {
    it("Should contain 2 facets", async function(){
      const userRepoNameHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
      const gitRepositoryLocation = await gitFactory.getRepository(userRepoNameHash);
  
      const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
      const diamondLoupe = await diamondLoupeFactory.attach(gitRepositoryLocation.location);
  
      const facets = await diamondLoupe.facets();
  
      expect(facets.length).to.equal(2);
    });

    it("Adding facet to GitFactory and creating new GitRepository", async function() {
      await gitFactory.addFacet(
        [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)]
      );

      const [numberOfEntries, entries] = await getDiamondCuts(gitFactory);

      expect(numberOfEntries).to.equal(3);
  
      expect(entries[0].facetAddress).to.equal(diamondCutFacet.address);
      expect(entries[0].action).to.equal(FacetCutAction.Add);
  
      expect(entries[1].facetAddress).to.equal(diamondLoupeFacet.address);
      expect(entries[1].action).to.equal(FacetCutAction.Add);

      expect(entries[2].facetAddress).to.equal(gitRepositoryManagementFacet.address);
      expect(entries[2].action).to.equal(FacetCutAction.Add);

      await gitFactory.createRepository(newRepoName);

      const userRepoNameHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, newRepoName);
      const gitRepositoryLocation = await gitFactory.getRepository(userRepoNameHash);
  
      const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
      const diamondLoupe = await diamondLoupeFactory.attach(gitRepositoryLocation.location);
  
      const facets = await diamondLoupe.facets();
  
      expect(facets.length).to.equal(3);
    });

    it("Adding facet to GitFactory using a different address", async function() {
      await expect(
        gitFactory.connect(ACCOUNTS[1]).addFacet(
          [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)]
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Trying to replace a facet with index out of bounds", async function() {
      await expect(gitFactory.replaceFacet(
        [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)],
        4
      )).to.be.revertedWith("Index out of bounds");
    });

    it("Trying to replace a facet using invalid address", async function() {
      await expect(gitFactory.connect(ACCOUNTS[1]).replaceFacet(
        [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)],
        2
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Switching first and last facet in position", async function() {
      await gitFactory.replaceFacet(
        [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)],
        0
      );
      await gitFactory.replaceFacet(
        [diamondCutFacet.address, FacetCutAction.Add, getSelectors(diamondCutFacet.functions)],
        2
      );
        
      const [numberOfEntries, entries] = await getDiamondCuts(gitFactory);

      expect(numberOfEntries).to.equal(3);
  
      expect(entries[0].facetAddress).to.equal(gitRepositoryManagementFacet.address);
      expect(entries[0].action).to.equal(FacetCutAction.Add);

      expect(entries[1].facetAddress).to.equal(diamondLoupeFacet.address);
      expect(entries[1].action).to.equal(FacetCutAction.Add);

      expect(entries[2].facetAddress).to.equal(diamondCutFacet.address);
      expect(entries[2].action).to.equal(FacetCutAction.Add);
    });

    it("Trying to remove facet using non-owner address", async function() {
      await expect(gitFactory.connect(ACCOUNTS[1]).removeFacet(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Trying to remove facet using out of bounds index", async function() {
      await expect(gitFactory.removeFacet(5)).to.be.revertedWith("Index out of bounds");
    })

    it("Removing first facet from GitFactory", async function() {
      await gitFactory.removeFacet(0);

      const [numberOfEntries, entries] = await getDiamondCuts(gitFactory);

      expect(numberOfEntries).to.equal(2);

      expect(entries[0].facetAddress).to.equal(diamondCutFacet.address);
      expect(entries[0].action).to.equal(FacetCutAction.Add);   

      expect(entries[1].facetAddress).to.equal(diamondLoupeFacet.address);
      expect(entries[1].action).to.equal(FacetCutAction.Add);   
    });

    it("Removing last facet from GitFactory", async function() {
      let [numberOfEntries, entries] = await getDiamondCuts(gitFactory);
      await gitFactory.removeFacet(numberOfEntries - 1);

      [numberOfEntries, entries] = await getDiamondCuts(gitFactory);

      expect(numberOfEntries).to.equal(1);

      expect(entries[0].facetAddress).to.equal(diamondCutFacet.address);
      expect(entries[0].action).to.equal(FacetCutAction.Add);
    });

    it("Adding facet to a deployed repository", async function(){
      const ownerRepos = await gitFactory.getUsersRepositories(DEFAULT_ACCOUNT_ADDRESS);
      const location = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, ownerRepos[0]);
      //get information about repository information
      const repositoryInfo = await gitFactory.getRepository(location);
      //get the diamond loupe contract so that we can check how many facets there are
      const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
      const diamondLoupe = await diamondLoupeFactory.attach(repositoryInfo.location);

      let facets = await diamondLoupe.facets();
      expect(facets.length).to.be.equal(2);

      // adding a new facet to a deployed repository
      await gitFactory.updateRepositoriesFacets(
        repositoryInfo.location,
        [[gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)]],
        "0x0000000000000000000000000000000000000000",
        "0x"
      );
      facets = await diamondLoupe.facets();
      expect(facets.length).to.be.equal(3);
    });

    it("Replacing facet of a deployed repository", async function(){
      const ownerRepos = await gitFactory.getUsersRepositories(DEFAULT_ACCOUNT_ADDRESS);
      const location = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, ownerRepos[0]);
      //get information about repository information
      const repositoryInfo = await gitFactory.getRepository(location);
      //get the diamond loupe contract so that we can check how many facets there are
      const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
      const diamondLoupe = await diamondLoupeFactory.attach(repositoryInfo.location);

      let facets = await diamondLoupe.facets();
      expect(facets.length).to.be.equal(3);
      
      // TODO: There we go 
      updatedContract = await deployContract("GitRepositoryManagementUpdated");
      updatedContract.deployed();
      await gitFactory.updateRepositoriesFacets(
        repositoryInfo.location,
        [[updatedContract.address, FacetCutAction.Replace, getSelectors(updatedContract.functions)]],
        "0x0000000000000000000000000000000000000000",
        "0x"
      );
      facets = await diamondLoupe.facets();
      expect(facets.length).to.be.equal(4);
    });

    it("Removing facet of a deployed repository", async function(){
      const ownerRepos = await gitFactory.getUsersRepositories(DEFAULT_ACCOUNT_ADDRESS);
      const location = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, ownerRepos[0]);
      //get information about repository information
      const repositoryInfo = await gitFactory.getRepository(location);
      //get the diamond loupe contract so that we can check how many facets there are
      const diamondLoupeFactory = await hre.ethers.getContractFactory("DiamondLoupeFacet");
      const diamondLoupe = await diamondLoupeFactory.attach(repositoryInfo.location);

      let facets = await diamondLoupe.facets();
      expect(facets.length).to.be.equal(4);
      
      // TODO: There we go 
      updatedContract = await deployContract("GitRepositoryManagementUpdated");
      updatedContract.deployed();
      // adding a new facet to a deployed repository
      await gitFactory.updateRepositoriesFacets(
        repositoryInfo.location,
        [["0x0000000000000000000000000000000000000000", FacetCutAction.Remove, getSelectors(updatedContract)]],
        "0x0000000000000000000000000000000000000000",
        "0x"
      );
      facets = await diamondLoupe.facets();
      expect(facets.length).to.be.equal(3);
    });
    
    it("Trying to update a git repository with a non-owner account", async function(){
      const ownerRepos = await gitFactory.getUsersRepositories(DEFAULT_ACCOUNT_ADDRESS);
      const location = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, ownerRepos[0]);
      //get information about repository information
      const repositoryInfo = await gitFactory.getRepository(location);
      
      // TODO: There we go 
      updatedContract = await deployContract("GitRepositoryManagementUpdated");
      updatedContract.deployed();
      // adding a new facet to a deployed repository
      await expect(gitFactory.connect(ACCOUNTS[1]).updateRepositoriesFacets(
        repositoryInfo.location,
        [["0x0000000000000000000000000000000000000000", FacetCutAction.Remove, getSelectors(updatedContract)]],
        "0x0000000000000000000000000000000000000000",
        "0x"
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });

  });

  describe("Testing GitRepository information functions", async function() {

    it("Check registered repository names", async function() {
      const repoNames = await gitFactory.getRepositoryNames();
      expect(repoNames).to.deep.equal([repoName, `${repoName}-2`]);
    });

    it("Check owner and users registered GitRepository names", async function(){
      const ownerRepos = await gitFactory.getUsersRepositories(DEFAULT_ACCOUNT_ADDRESS);
      expect(ownerRepos).to.deep.equal([repoName, newRepoName]);

      const userRepos = await gitFactory.getUsersRepositories(ACCOUNTS[1].address);
      expect(userRepos).to.deep.equal([repoName]);
    });

    it("Get users to a repositry name", async function() {
      let users = await gitFactory.getRepositoriesUserList(repoName);
      expect(users).to.deep.equal([DEFAULT_ACCOUNT_ADDRESS, ACCOUNTS[1].address]);

      users = await gitFactory.getRepositoriesUserList(newRepoName);
      expect(users).to.deep.equal([DEFAULT_ACCOUNT_ADDRESS]);
    })
  });

  describe("Test removing GitRepository", async function() {
    const repoUserMapping = {};

    beforeEach(async function() {
      let users, userRepoHash, repository;
      const gitRepoFactory = await ethers.getContractFactory("GitRepositoryManagement");

      //before we do the test, we deploy a new repositories, which include the gitRepositoryManagement facet
      const diamondCut = [
        [diamondCutFacet.address, FacetCutAction.Add, getSelectors(diamondCutFacet.functions)],
        [diamondLoupeFacet.address, FacetCutAction.Add, getSelectors(diamondLoupeFacet.functions)],
        [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)]
      ];
  
      gitFactory = await deployContract("GitFactory", [diamondCut, deployer.address]);
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
      gitFactory.removeRepository(newRepoName, repoInfo.userIndex.toNumber(), repoInfo.repoIndex.toNumber());

      let userRepoHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, newRepoName);
      let repository = await gitFactory.getRepository(userRepoHash);

      expect(repository.isActive).to.be.false;

      const repositoryNames = await gitFactory.getRepositoryNames();
      expect(repositoryNames.length).to.be.equal(1);
      expect(repositoryNames).to.deep.equal(['TestRepo']);

      // get the second git repository of the same user who just deleted his repository
      // userRepoHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
      // repository = await gitFactory.getRepository(userRepoHash);
      
      // let repo = await gitRepoFactory.attach(repository.location);
      // let newRepoInfo = await repo.getRepositoryInfo();
      // console.log(newRepoInfo)
      // // expect(newRepoInfo.userIndex).to.be.equal(repoInfo.userIndex);

      // // get repository of the second user
      // userRepoHash = await gitFactory.getUserRepoNameHash(ACCOUNTS[1].address, repoName);
      // repository = await gitFactory.getRepository(userRepoHash);
      
      // repo = await gitRepoFactory.attach(repository.location);
      // newRepoInfo = await repo.getRepositoryInfo();
      // console.log(newRepoInfo);
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

  describe("Test sending and collecting tips", async function() {
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
});
