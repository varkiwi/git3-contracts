const { expect, assert } = require("chai");
const { waffle } = require("hardhat");

const { deployContract } = require("./utils/deployContract");
const { getSelectors } = require("./utils/getSelectors");
const { FacetCutAction} = require("./utils/facetCutAction");
const { ethers } = require("ethers");


describe("Testing Git Issues of Git Repository", function() {
  const repoName = "TestRepo";
  const issueCid = "Test123";
  const issueBountyCid = "bountyCid";
  const issueReopenCid = "ReopenCid";

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
    ACCOUNTS = waffle.provider.getWallets();
    DEFAULT_ACCOUNT_ADDRESS = ACCOUNTS[0].address;
    REPO_OWNER_ACCOUNT = ACCOUNTS[0];
    OUTSIDER_ACCOUNT = ACCOUNTS[1];

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

    diamondCut2 = [
        [diamondCutFacet.address, getSelectors(diamondCutFacet.functions)],
        [diamondLoupeFacet.address, getSelectors(diamondLoupeFacet.functions)],
        [gitRepositoryManagementFacet.address, getSelectors(gitRepositoryManagementFacet.functions)],
        [gitIssuesFacet.address, getSelectors(gitIssuesFacet.functions)]
      ];

    gitContractRegistry = await deployContract("GitContractRegistry",[diamondCut2]);
    await gitContractRegistry.deployed();

    gitFactory = await deployContract("GitFactory", [diamondCut, deployer.address, gitContractRegistry.address]);
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

      it("Non-owner trying to open same issue again", async function() {
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

      describe("Opening and closing issue without bounty", function() {
        it("Open issue without bounty", async function() {
            // outsider opens issue
            await gitIssues.connect(OUTSIDER_ACCOUNT).openIssue(cid);
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            const issue = await gitIssues.getIssue(issueHash);
    
            expect(issue.cid).to.be.equal(cid);
            expect(issue.isActive).to.be.true;
            expect(issue.state).to.be.equal(IssueState.Open);
            expect(issue.bounty.toNumber()).to.be.equal(0);
            expect(issue.opener).to.be.equal(OUTSIDER_ACCOUNT.address);
            expect(issue.placeInList).to.be.equal(issues.length - 1);
        });

        it("Third party tries to close issue without bounty", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await expect(
                gitIssues.connect(ACCOUNTS[2]).updateIssueState(issueHash, IssueState.Closed)
            ).to.be.revertedWith("You don't have the permission to close this issue");
        });

        it("Opener closes issue without bounty", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await gitIssues.connect(OUTSIDER_ACCOUNT).updateIssueState(issueHash, IssueState.Closed);
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.state).to.be.equal(IssueState.Closed);
        });

        it("Open issue through appending a new answer", async function() {
            const answerCid = "Answer1Cid";
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await gitIssues.connect(OUTSIDER_ACCOUNT).appendAnswerToIssue(issueHash, answerCid, {value: bounty});
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.state).to.be.equal(IssueState.Open);
            expect(issue.bounty).to.be.equal(0);
        });

        it("Open another issue without bounty", async function() {
            // outside opens issue
            await gitIssues.connect(OUTSIDER_ACCOUNT).openIssue(`${cid}-2`);
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            const issue = await gitIssues.getIssue(issueHash);
    
            expect(issue.cid).to.be.equal(`${cid}-2`);
            expect(issue.isActive).to.be.true;
            expect(issue.state).to.be.equal(IssueState.Open);
            expect(issue.bounty.toNumber()).to.be.equal(0);
            expect(issue.opener).to.be.equal(OUTSIDER_ACCOUNT.address);
            expect(issue.placeInList).to.be.equal(issues.length - 1);
        });

        it("Try to resolve, even there is no bounty", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await expect(gitIssues.updateIssueState(issueHash, IssueState.Resolved)).to.be.revertedWith("Can't resolve the issue");
        });

        it("Owner of repository closes issue without bounty", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await gitIssues.updateIssueState(issueHash, IssueState.Closed);
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.state).to.be.equal(IssueState.Closed);
        });
      });

      describe("Opening, resolving and closing issue with a bounty", function() {
        it("Open another issue with a bounty", async function() {
            // outside opens issue
            await gitIssues.connect(OUTSIDER_ACCOUNT).openIssue(`${cid}-3`, {value: bounty});
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            const issue = await gitIssues.getIssue(issueHash);
    
            expect(issue.cid).to.be.equal(`${cid}-3`);
            expect(issue.isActive).to.be.true;
            expect(issue.state).to.be.equal(IssueState.Open);
            expect(issue.bounty.toNumber()).to.be.equal(bounty);
            expect(issue.opener).to.be.equal(OUTSIDER_ACCOUNT.address);
            expect(issue.placeInList).to.be.equal(issues.length - 1);
        });

        it("Try to close an issue with a bounty - reverts", async function() {
            // outside opens issue
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await expect(
                gitIssues.connect(OUTSIDER_ACCOUNT).updateIssueState(issueHash, IssueState.Closed)
                ).to.be.revertedWith("Can't close the issue");
        });

        it("Appending an answer and attaching a bounty", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            // in order to resolve an issue, we need to add a bounty first
            await gitIssues.appendAnswerToIssue(issueHash, "SomeAnswerCID", {value: bounty});
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.bounty).to.be.equal(bounty.mul(2));
            expect(issue.state).to.be.equal(IssueState.Open);
        });

        it("Resolving the issue", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await gitIssues.connect(REPO_OWNER_ACCOUNT).updateIssueState(issueHash, IssueState.Resolved);
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.bounty).to.be.equal(bounty.mul(2));
            expect(issue.state).to.be.equal(IssueState.Resolved);
            expect(issue.resolver).to.be.equal(REPO_OWNER_ACCOUNT.address);
        });

        it("Appending an answer to a resolved issue and attaching a bounty", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];

            const issueBefore = await gitIssues.getIssue(issueHash);
            // in order to resolve an issue, we need to add a bounty first
            await gitIssues.appendAnswerToIssue(issueHash, "SomeAnswerCID", {value: bounty});
            const issueAfter = await gitIssues.getIssue(issueHash);
            expect(issueAfter.bounty).to.be.equal(bounty.mul(2));
            expect(issueAfter.bounty).to.be.equal(issueBefore.bounty);
            expect(issueAfter.state).to.be.equal(IssueState.Resolved);
        });

        it("Rejecting the resolved issue", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await gitIssues.connect(OUTSIDER_ACCOUNT).updateIssueState(issueHash, IssueState.Open);
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.state).to.be.equal(IssueState.Open);
            expect(issue.bounty).to.be.equal(bounty.mul(2));
        });

        it("Resolving the issue again", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await gitIssues.connect(REPO_OWNER_ACCOUNT).updateIssueState(issueHash, IssueState.Resolved);
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.bounty).to.be.equal(bounty.mul(2));
            expect(issue.state).to.be.equal(IssueState.Resolved);
            expect(issue.resolver).to.be.equal(REPO_OWNER_ACCOUNT.address);
        });

        it("Trying to close issue with bounty using third account", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await expect(gitIssues.connect(ACCOUNTS[2])
                .updateIssueState(issueHash, IssueState.Closed)
            ).to.be.revertedWith("Can't close the issue");
        });

        it("Trying to close issue using resolvers account", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await expect(gitIssues.connect(REPO_OWNER_ACCOUNT)
                .updateIssueState(issueHash, IssueState.Closed)
            ).to.be.revertedWith("Can't close the issue");
        });

        it("Closing issue using openers account before block time expires", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            const balanceBefore = await provider.getBalance(REPO_OWNER_ACCOUNT.address)
            await gitIssues.connect(OUTSIDER_ACCOUNT).updateIssueState(issueHash, IssueState.Closed);
            const balanceAfter = await provider.getBalance(REPO_OWNER_ACCOUNT.address)
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.bounty).to.be.equal(0);
            expect(issue.state).to.be.equal(IssueState.Closed);
            expect(issue.resolver).to.be.equal(REPO_OWNER_ACCOUNT.address);
            // resolver receives 99% from the bounty!
            // and the factory gets 1% from the bounty
            expect(balanceAfter).to.be.equal(
                balanceBefore.add(bounty.mul(2).mul(99).div(100))
            );
        });
      });

      describe("Opening, resolving and closing issue with a bounty, where we wait till the blocks expire", function() {
        it("Open another issue with a bounty", async function() {
            // outside opens issue
            await gitIssues.connect(OUTSIDER_ACCOUNT).openIssue(`${cid}-4`, {value: bounty});
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            const issue = await gitIssues.getIssue(issueHash);
    
            expect(issue.cid).to.be.equal(`${cid}-4`);
            expect(issue.isActive).to.be.true;
            expect(issue.state).to.be.equal(IssueState.Open);
            expect(issue.bounty.toNumber()).to.be.equal(bounty);
            expect(issue.opener).to.be.equal(OUTSIDER_ACCOUNT.address);
            expect(issue.placeInList).to.be.equal(issues.length - 1);
        });

        it("Try to close an issue with a bounty - reverts", async function() {
            // outside opens issue
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await expect(
                gitIssues.connect(OUTSIDER_ACCOUNT).updateIssueState(issueHash, IssueState.Closed)
                ).to.be.revertedWith("Can't close the issue");
        });

        it("Appending an answer and attaching a bounty", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            // in order to resolve an issue, we need to add a bounty first
            await gitIssues.appendAnswerToIssue(issueHash, "SomeAnswerCID", {value: bounty});
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.bounty).to.be.equal(bounty.mul(2));
            expect(issue.state).to.be.equal(IssueState.Open);
        });

        it("Resolving the issue", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await gitIssues.connect(REPO_OWNER_ACCOUNT).updateIssueState(issueHash, IssueState.Resolved);
            const issue = await gitIssues.getIssue(issueHash);
            expect(issue.bounty).to.be.equal(bounty.mul(2));
            expect(issue.state).to.be.equal(IssueState.Resolved);
            expect(issue.resolver).to.be.equal(REPO_OWNER_ACCOUNT.address);
        });

        it("Trying to close issue before expire time - reverts", async function() {
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            await expect(
                gitIssues.connect(REPO_OWNER_ACCOUNT).updateIssueState(issueHash, IssueState.Closed)
            ).to.be.revertedWith("Can't close the issue");
        });

        it("Closing issue after block time expired", async function() {
            //TODO: to make this testcase work, change the 604800 to 200 in the contract
            const issues = await gitIssues.getAllIssues();
            const issueHash = issues[issues.length - 1];
            let issue = await gitIssues.getIssue(issueHash);

            const resolvedBlockNumber = issue.resolvedBlockNumber.toNumber();

            const autoResolveWaitBlocks = 200;
            // 604800 is the number of blocks which need to be processed until the auto resolver can be used
            let sendNoTx = resolvedBlockNumber + autoResolveWaitBlocks;
            for (; sendNoTx > 0; sendNoTx -= 1) {
                await ACCOUNTS[0].sendTransaction({to: ACCOUNTS[1].address, value: 1});
            }

            const balanceBefore = await provider.getBalance(REPO_OWNER_ACCOUNT.address)
            const tx = await gitIssues.connect(REPO_OWNER_ACCOUNT).updateIssueState(issueHash, IssueState.Closed);
            const txReceipt = await tx.wait();
            const balanceAfter = await provider.getBalance(REPO_OWNER_ACCOUNT.address)

            issue = await gitIssues.getIssue(issueHash);
            expect(issue.bounty).to.be.equal(0);
            expect(issue.state).to.be.equal(IssueState.Closed);
            expect(issue.resolver).to.be.equal(REPO_OWNER_ACCOUNT.address);
            // resolver receives 99% from the bounty!
            // and the factory gets 1% from the bounty
            expect(balanceAfter).to.be.equal(
                balanceBefore
                    .add(bounty.mul(2).mul(99).div(100))
                    .sub(tx.gasPrice.mul(txReceipt.cumulativeGasUsed))
            );
        });
      });


      //TODO: This test case is outdated, since we can't open an issue with
      //updateIssueState. Instead, we should use the appendAnswerToIssue function 
    //   it("Opening an issue which was already closed", async function() {
    //     const issues = await gitIssues.getAllIssues();
    //     const issueHash = issues[issues.length - 1];
    //     const issueBefore = await gitIssues.getIssue(issueHash);
    //     console.log(issueBefore);
    //     await gitIssues.updateIssueState(issueHash, IssueState.Open);
    //     const issue = await gitIssues.getIssue(issueHash);
    //     console.log(issue);
    //     expect(issue.state).to.be.equal(IssueState.Open);
    //   });

    //   it("Opening an issue through appending an answer and attaching a bounty - bounty is not added and send back to user", async function() {
    //     const issues = await gitIssues.getAllIssues();
    //     const issueHash = issues[issues.length - 1];
    //     // in order to resolve an issue, we need to add a bounty first
    //     await gitIssues.appendAnswerToIssue(issueHash, "SomeAnswerCID", {value: bounty});
    //     const issue = await gitIssues.getIssue(issueHash);
    //     expect(issue.bounty).to.be.equal(0);
    //     expect(issue.state).to.be.equal(IssueState.Open);

    //     // now we are going to resolve it :)
    //     // await gitIssues.connect(ACCOUNTS[1]).updateIssueState(issueHash, IssueState.Resolved);
    //     // issue = await gitIssues.getIssue(issueHash);
    //     // expect(issue.state).to.be.equal(IssueState.Resolved);
    //   });

    //   it("Resolving the issue again", async function() {
    //     const issues = await gitIssues.getAllIssues();
    //     const issueHash = issues[issues.length - 1];
    //     await gitIssues.connect(ACCOUNTS[1]).updateIssueState(issueHash, IssueState.Resolved);
    //     const issue = await gitIssues.getIssue(issueHash);
    //     expect(issue.state).to.be.equal(IssueState.Resolved);
    //     expect(issue.resolver).to.be.equal(ACCOUNTS[1].address);
    //   });

    

    //   it("Closing issue with bounty and paying out", async function() {
    //     // calc the 1% for the factory
    //     const factoryTip = bounty.div(100);
    //     // and the 99% for the resolver
    //     const resolverTip = bounty.mul(99).div(100);

    //     const issues = await gitIssues.getAllIssues();
    //     const issueHash = issues[issues.length - 1];
    //     // get resolvers current balance
    //     const resolverBalanceBefore = await provider.getBalance(ACCOUNTS[1].address);

    //     await gitIssues.updateIssueState(issueHash, IssueState.Closed);
    //     const issue = await gitIssues.getIssue(issueHash);
    //     const resolverBalanceAfter = await provider.getBalance(ACCOUNTS[1].address);

    //     expect(issue.state).to.be.equal(IssueState.Closed);
    //     expect(issue.bounty.toNumber()).to.be.equal(0);
    //     expect(issue.resolved).to.be.true;
    //     expect(await gitFactory.tips()).to.be.equal(factoryTip);
    //     expect(resolverBalanceAfter).to.be.equal(resolverBalanceBefore.add(resolverTip));
    //   });

    //   it("Reopening an already resolved and closed issue", async function() {
    //     const issues = await gitIssues.getAllIssues();
    //     const issueHash = issues[issues.length - 1];
    //     await gitIssues.updateIssueState(issueHash, IssueState.Open);
    //     const issue = await gitIssues.getIssue(issueHash);
    //     expect(issue.state).to.be.equal(IssueState.Open);
    //   });

    //   it("Trying to add a bounty to an reopened issue", async function() {
    //     const issues = await gitIssues.getAllIssues();
    //     const issueHash = issues[issues.length - 1];
    //     await expect(
    //       gitIssues.appendAnswerToIssue(issueHash, "SomeAnswerCID", {value: bounty})
    //     ).to.be.revertedWith("Can't add a bounty for already resolved issue");
    //   });

    //   it("Trying to resolve an already resolved and closed issue", async function() {
    //     const issues = await gitIssues.getAllIssues();
    //     const issueHash = issues[issues.length - 1];
    //     await expect(
    //       gitIssues.updateIssueState(issueHash, IssueState.Resolved)
    //     ).to.be.revertedWith("Can't resolve the issue");
    //   });

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
