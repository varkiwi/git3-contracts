const { expect, assert } = require("chai");
const { waffle } = require("hardhat");
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");
const { FacetCutAction} = require("./utils/facetCutAction");


describe("Testing Git Repository", function() {
  const repoName = "TestRepo";
  const issueCid = "Test123";
  const issueBountyCid = "bountyCid";
  const issueReopenCid = "ReopenCid";
  const autoResolveWaitBlocks = 200;

  const provider = waffle.provider;

  const IssueState = {
    Open: 0,
    Closed: 1,
    Resolved: 2
  };

  let ACCOUNTS;
  let DEFAULT_ACCOUNT_ADDRESS;
  let gitFactory, diamondCutFacet, diamondLoupeFacet, gitRepositoryManagementFacet, deployer, gitRepositoryLocation, diamondCut, gitIssues;

  before(async function(){
    ACCOUNTS = await ethers.getSigners()
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;

    diamondCutFacet = await deployContract("DiamondCutFacet");
    diamondLoupeFacet = await deployContract("DiamondLoupeFacet");
    gitRepositoryManagementFacet = await deployContract("GitRepositoryManagement");
    gitIssuesFacet = await deployContract("GitIssues");
    deployer = await deployContract("GitRepositoryDeployer");

    await diamondCutFacet.deployed();
    await diamondLoupeFacet.deployed();
    await gitRepositoryManagementFacet.deployed();
    await gitIssuesFacet.deployed();
    await deployer.deployed();

    diamondCut = [
      [diamondCutFacet.address, FacetCutAction.Add, getSelectors(diamondCutFacet.functions)],
      [diamondLoupeFacet.address, FacetCutAction.Add, getSelectors(diamondLoupeFacet.functions)],
      [gitRepositoryManagementFacet.address, FacetCutAction.Add, getSelectors(gitRepositoryManagementFacet.functions)],
      [gitIssuesFacet.address, FacetCutAction.Add, getSelectors(gitIssuesFacet.functions)]
    ];

    gitFactory = await deployContract("GitFactory", [diamondCut, deployer.address]);
    await gitFactory.deployed();
    await gitFactory.createRepository(repoName);
    const userRepoNameHash = await gitFactory.getUserRepoNameHash(DEFAULT_ACCOUNT_ADDRESS, repoName);
    gitRepositoryLocation = await gitFactory.getRepository(userRepoNameHash);

    const gitIssuesFactory = await hre.ethers.getContractFactory("GitIssues");
    gitIssues = await gitIssuesFactory.attach(gitRepositoryLocation.location);
  });

  describe("Testing GitIssues of GitRepository", function(){
    describe("Testing openIssue function", function() {
      it("Owner opening a new issue without a bounty", async function() {
        await gitIssues.openIssue(issueCid);
        const issues = await gitIssues.getAllIssues();
        expect(issues.length).to.be.equal(1);
        const issue = await gitIssues.getIssue(issues[0]);

        expect(issue.cid).to.be.equal(issueCid);
        expect(issue.isActive).to.be.true;
        expect(issue.state).to.be.equal(0);
        expect(issue.bounty.toNumber()).to.be.equal(0);
        expect(issue.opener).to.be.equal(DEFAULT_ACCOUNT_ADDRESS);
        expect(issue.placeInList).to.be.equal(0);
      });

      it("Owner trying to open same issue again", async function() {
        await expect(gitIssues.openIssue(issueCid)).to.be.revertedWith("Open issue exists already");
      });

      it("Non-owner opening a new issue without a bounty", async function() {
        await gitIssues.connect(ACCOUNTS[1]).openIssue(issueCid);
        const issues = await gitIssues.getAllIssues();
        expect(issues.length).to.be.equal(2);
        const issue = await gitIssues.getIssue(issues[1]);

        expect(issue.cid).to.be.equal(issueCid);
        expect(issue.isActive).to.be.true;
        expect(issue.state).to.be.equal(0);
        expect(issue.bounty.toNumber()).to.be.equal(0);
        expect(issue.opener).to.be.equal(ACCOUNTS[1].address);
        expect(issue.placeInList).to.be.equal(1);
      });

      it("Non-wner trying to open same issue again", async function() {
        await expect(gitIssues.connect(ACCOUNTS[1]).openIssue(issueCid)).to.be.revertedWith("Open issue exists already");
      });

      it("Owner opening issue with bounty", async function() {
        const bounty = ethers.BigNumber.from(1337);
        await gitIssues.openIssue(issueBountyCid, {value: bounty});
        const issues = await gitIssues.getAllIssues();
        expect(issues.length).to.be.equal(3);
        const issue = await gitIssues.getIssue(issues[2]);

        expect(issue.cid).to.be.equal(issueBountyCid);
        expect(issue.isActive).to.be.true;
        expect(issue.state).to.be.equal(0);
        expect(issue.bounty).to.be.equal(bounty);
        expect(issue.opener).to.be.equal(DEFAULT_ACCOUNT_ADDRESS);
        expect(issue.placeInList).to.be.equal(2);
      });

      it("Reopening an closed issue with the openIssue function", async function() {
        await gitIssues.openIssue(issueReopenCid);
        const issueHash = await gitIssues.getUserCidHash(DEFAULT_ACCOUNT_ADDRESS, issueReopenCid);
        await gitIssues.updateIssueState(issueHash, IssueState.Closed);
        let issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Closed);
        await gitIssues.openIssue(issueReopenCid);
        issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Open);
      })
    });

    describe("Testing appendAnswerToIssue function", function() {
      it("Append answer to an existing issue without adding bounty", async function() {
        const answerCid = "Answer1Cid";
        const allIssues = await gitIssues.getAllIssues();
        let issue = await gitIssues.getIssue(allIssues[0]);
        expect(issue.issueAnswers.length).to.be.equal(0);

        await gitIssues.connect(ACCOUNTS[1]).appendAnswerToIssue(allIssues[0], answerCid);
        issue = await gitIssues.getIssue(allIssues[0]);
        expect(issue.issueAnswers.length).to.be.equal(1);
        expect(issue.issueAnswers[0].cid).to.be.equal(answerCid);
        expect(issue.issueAnswers[0].author).to.be.equal(ACCOUNTS[1].address);
      });

      it("Append answer to an existing issue with adding a bounty", async function() {
        const answerCid = "Answer2Cid";
        const bounty = ethers.BigNumber.from(1337);

        const allIssues = await gitIssues.getAllIssues();
        let issue = await gitIssues.getIssue(allIssues[0]);
        expect(issue.issueAnswers.length).to.be.equal(1);

        await gitIssues.connect(ACCOUNTS[1]).appendAnswerToIssue(allIssues[0], answerCid, {value: bounty});
        issue = await gitIssues.getIssue(allIssues[0]);
        expect(issue.issueAnswers.length).to.be.equal(2);
        expect(issue.issueAnswers[1].cid).to.be.equal(answerCid);
        expect(issue.issueAnswers[1].author).to.be.equal(ACCOUNTS[1].address);
        expect(issue.bounty).to.be.equal(bounty);
      });

      it("Append answer to an non existing issue", async function() {
        const answerCid = "Answer2Cid";

        const allIssues = await gitIssues.getAllIssues();
        //reverse the issue location hash :)
        const nonExistingCid = `0x${allIssues[0].slice(2).split("").reverse().join("")}`;
        
        await expect(gitIssues.getIssue(nonExistingCid)).to.be.revertedWith("Issue with given cid does not exist");

        await expect(gitIssues
          .connect(ACCOUNTS[1])
          .appendAnswerToIssue(nonExistingCid, answerCid)
        ).to.be.revertedWith("Issue with given cid does not exist");
      });
    });

    describe("Testing state different state transitions for issues", function() {
      const cid = 'test-1-cid';
      const bounty = ethers.BigNumber.from(1337);

      it("Open issue without bounty", async function() {
        // open issue
        await gitIssues.openIssue(cid);
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        const issue = await gitIssues.getIssue(issueHash);

        expect(issue.cid).to.be.equal(cid);
        expect(issue.isActive).to.be.true;
        expect(issue.state).to.be.equal(IssueState.Open);
        expect(issue.bounty.toNumber()).to.be.equal(0);
        expect(issue.opener).to.be.equal(DEFAULT_ACCOUNT_ADDRESS);
        expect(issue.placeInList).to.be.equal(issues.length - 1);
      });
      // we are trying to resolve, but that shouldn't work, since there is no bounty attached to it :)
      it("Try to resolve, even there is no bounty", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await expect(gitIssues.updateIssueState(issueHash, IssueState.Resolved)).to.be.revertedWith("Can't resolve the issue");
      });
      // instead we are going to close it first.
      it("Closing issue without having a bounty attached to it", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await gitIssues.updateIssueState(issueHash, IssueState.Closed);
        const issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Closed);
      });

      it("Opening an issue which was already closed", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await gitIssues.updateIssueState(issueHash, IssueState.Open);
        const issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Open);
      });

      it("Resolving an issue with a bounty", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        // in order to resolve an issue, we need to add a bounty first
        await gitIssues.appendAnswerToIssue(issueHash, "SomeAnswerCID", {value: bounty});
        let issue = await gitIssues.getIssue(issueHash);
        expect(issue.bounty).to.be.equal(bounty);
        expect(issue.state).to.be.equal(IssueState.Open);

        // now we are going to resolve it :)
        await gitIssues.connect(ACCOUNTS[1]).updateIssueState(issueHash, IssueState.Resolved);
        issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Resolved);
      });

      it("Rejecting the resolved issue", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await gitIssues.updateIssueState(issueHash, IssueState.Open);
        const issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Open);
        expect(issue.bounty).to.be.equal(bounty);
      });

      it("Resolving the issue again", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await gitIssues.connect(ACCOUNTS[1]).updateIssueState(issueHash, IssueState.Resolved);
        const issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Resolved);
        expect(issue.resolver).to.be.equal(ACCOUNTS[1].address);
      });

      it("Closing issue with bounty using different account", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await expect(gitIssues.connect(ACCOUNTS[1])
          .updateIssueState(issueHash, IssueState.Closed)
        ).to.be.revertedWith("Can't close the issue");
      });

      it("Closing issue with bounty and paying out", async function() {
        // calc the 1% for the factory
        const factoryTip = bounty.div(100);
        // and the 99% for the resolver
        const resolverTip = bounty.mul(99).div(100);

        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        // get resolvers current balance
        const resolverBalanceBefore = await provider.getBalance(ACCOUNTS[1].address);

        await gitIssues.updateIssueState(issueHash, IssueState.Closed);
        const issue = await gitIssues.getIssue(issueHash);
        const resolverBalanceAfter = await provider.getBalance(ACCOUNTS[1].address);

        expect(issue.state).to.be.equal(IssueState.Closed);
        expect(issue.bounty.toNumber()).to.be.equal(0);
        expect(issue.resolved).to.be.true;
        expect(await gitFactory.tips()).to.be.equal(factoryTip);
        expect(resolverBalanceAfter).to.be.equal(resolverBalanceBefore.add(resolverTip));
      });

      it("Reopening an already resolved and closed issue", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await gitIssues.updateIssueState(issueHash, IssueState.Open);
        const issue = await gitIssues.getIssue(issueHash);
        expect(issue.state).to.be.equal(IssueState.Open);
      });

      it("Trying to add a bounty to an reopened issue", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await expect(
          gitIssues.appendAnswerToIssue(issueHash, "SomeAnswerCID", {value: bounty})
        ).to.be.revertedWith("Can't add a bounty for already resolved issue");
      });

      it("Trying to resolve an already resolved and closed issue", async function() {
        const issues = await gitIssues.getAllIssues();
        const issueHash = issues[issues.length - 1];
        await expect(
          gitIssues.updateIssueState(issueHash, IssueState.Resolved)
        ).to.be.revertedWith("Can't resolve the issue");
      });

      // it("Trying to increate the block number", async function(){
      //   const newBounty = ethers.BigNumber.from(1337);
      //   const newIssueCid = "TestingAutoResolve";
      //   await gitIssues.openIssue(newIssueCid, {value: newBounty});
        
      //   const issues = await gitIssues.getAllIssues();
      //   const issueHash = issues[issues.length - 1];

      //   await gitIssues.connect(ACCOUNTS[1]).updateIssueState(issueHash, IssueState.Resolved);
      //   let issue = await gitIssues.getIssue(issueHash);
      //   const resolvedBlockNumber = issue.resolvedBlockNumber.toNumber();
        
      //   // the resolver is not able to close the issue
      //   await expect(gitIssues.connect(ACCOUNTS[1]).updateIssueState(issueHash, IssueState.Closed)).to.be.revertedWith("Can't close the issue");
      //   // 604800 is the number of blocks which need to be processed until the auto resolver can be used
      //   let sendNoTx = resolvedBlockNumber + autoResolveWaitBlocks;
      //   for (; sendNoTx > 0; sendNoTx -= 1) {
      //     await ACCOUNTS[0].sendTransaction({to: ACCOUNTS[1].address, value: 1});
      //   }
      //   // unless a number of blocks passed
      //   gitIssues.connect(ACCOUNTS[1]).updateIssueState(issueHash, IssueState.Closed);
      //   issue = await gitIssues.getIssue(issueHash);
      //   expect(issue.state).to.be.equal(IssueState.Closed);
      // }); 
    });
  });
});
