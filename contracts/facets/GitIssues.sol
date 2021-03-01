// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../GitFactory.sol";
import "../libraries/LibDiamond.sol";

contract GitIssues {
    event NewIssue(string Cid);

    enum IssueState {Open, Closed, Resolved}

    bytes32 constant GIT_ISSUES_STORAGE_POSITION = keccak256("diamond.standard.git.issues");
    
    // Storage struct which contains a mapping from bytes32 to an Issue, and an array containing all issues
    struct GitIssuesStorage {
        mapping(bytes32 => Issue) issues;
        bytes32[] allIssues;
    }
    
    struct Issue {
        bool isActive;
        IssueState state;
        string cid;
        IssueText[] issueAnswers;
        uint bounty;
        address opener;
        address resolver;
        uint resolvedBlockNumber;
        bool resolved;
        uint placeInList;
    }

    struct IssueText {
        string cid;     // references the text stored somewhere else
        address author; // author of the text
    }

    // Returns the struct from a specified position in contract storage
    // ds is short for DiamondStorage
    function gitIssues() internal pure returns(GitIssuesStorage storage issues) {
        // Specifies a random position from a hash of a string
        // bytes32 storagePosition = keccak256("diamond.storage.LibA");
        // Set the position of our struct in contract storage
        bytes32 position = GIT_ISSUES_STORAGE_POSITION;
        assembly {
            issues.slot := position
        }
    }

    /**
     * The open issue function allows a user to open or reopen an already closed issue by providing a cid. The user 
     * is able to add a bounty to an issue.
     * 
     * @param issueCid (string) - CID of issue location
     */
    function openIssue(string memory issueCid) public payable {
        GitIssuesStorage storage i = gitIssues();
        bytes32 userCidHash = getUserCidHash(msg.sender, issueCid);
        Issue storage issue = i.issues[userCidHash];
        // if there exists already an issue but the state is closed, it is reopened
        if(issue.isActive && issue.state == IssueState.Closed) {
            issue.state = IssueState.Open;
        // if no issue exists, a new one is opened
        } else if (!issue.isActive){
            issue.isActive = true;
            issue.state = IssueState.Open;
            issue.cid = issueCid;
            issue.bounty = msg.value;
            issue.opener = msg.sender;
            issue.placeInList = i.allIssues.length;

            i.issues[userCidHash] = issue;
            i.allIssues.push(userCidHash);
            emit NewIssue(issueCid);
        // otherwise just revert
        } else {
            revert("Open issue exists already");
        }
    }

    /**
     * A discussion within an issue can happen. So this function is used to store the cid of the answers in the issue.
     *
     * @param issueHash (bytes32) - The issue hash, which is a hash of issue opener address and cid
     * @param issueAnswerCid (string) - The location of the answer 
     */
    function appendAnswerToIssue(bytes32 issueHash, string calldata issueAnswerCid) public payable {
        GitIssuesStorage storage i = gitIssues();
        require(i.issues[issueHash].isActive, "Issue with given cid does not exist");
        require(!i.issues[issueHash].resolved, "Can't add a bounty for already resolved issue");
        i.issues[issueHash].issueAnswers.push(IssueText({
            cid: issueAnswerCid,
            author: msg.sender
        }));
        if(msg.value > 0) {
            i.issues[issueHash].bounty += msg.value;
        }
    }

    /**
     * The updateIssueState function is used in order to update the state of an issue. The state can be either Open, 
     * Resolved or Closed.
     * Resolved means, that a user submitted a potential solution to a problem and awaits acceptance. Once the opener
     * of the issue closes the issue, the solution is accepted and a bounty is payed out to the resolver.
     *
     * @param issueHash (bytes32) - The hash to identify an issue
     * @param state (IssueState) - The new state the issue should transition to
     */
    function updateIssueState(bytes32 issueHash, IssueState state) public {
        GitIssuesStorage storage i = gitIssues();
        require(i.issues[issueHash].isActive, "Issue with given cid does not exist");
        // state transition to closed
        if(state == IssueState.Closed) {
            // if the current state is open and there is not
            if(i.issues[issueHash].state == IssueState.Open && i.issues[issueHash].bounty == 0) {
                i.issues[issueHash].state = state;
            // if the current state is resolved and the opener is also the one who is closing it, confirming the payout
            } else if(i.issues[issueHash].state == IssueState.Resolved && i.issues[issueHash].opener == msg.sender) {
                i.issues[issueHash].state = state;
                i.issues[issueHash].resolved = true;
                LibDiamond.RepositoryInformation storage ri = LibDiamond.repositoryInformation();
                uint tips = i.issues[issueHash].bounty;
                // factory get's 1%
                (bool success, ) = address(ri.factory).call{value: tips / 100, gas: 19000}('');
                require(success);
                //resolver gets's 99%
                payable(i.issues[issueHash].resolver).transfer(tips * 99 / 100);
                i.issues[issueHash].bounty = 0;
            } else if(i.issues[issueHash].state == IssueState.Resolved && 
                    (block.number - i.issues[issueHash].resolvedBlockNumber) >= 604800) 
            { 
                i.issues[issueHash].state = state;
                i.issues[issueHash].resolved = true;
                LibDiamond.RepositoryInformation storage ri = LibDiamond.repositoryInformation();
                uint tips = i.issues[issueHash].bounty;
                // factory get's 1%
                (bool success, ) = address(ri.factory).call{value: tips / 100, gas: 19000}('');
                require(success);
                //resolver gets's 99%
                payable(i.issues[issueHash].resolver).transfer(tips * 99 / 100);
                i.issues[issueHash].bounty = 0;
            }else {
                revert("Can't close the issue");
            }
        //state transition to resolved
        } else if(state == IssueState.Resolved) {
            // can go to resolved when the state is open, has a bounty and and has not been resolved previously
            if(i.issues[issueHash].state == IssueState.Open && i.issues[issueHash].bounty > 0 && !i.issues[issueHash].resolved) {
                i.issues[issueHash].state = state;
                i.issues[issueHash].resolver = msg.sender;
                i.issues[issueHash].resolvedBlockNumber = block.number;
            } else {
                revert("Can't resolve the issue");
            }
        // state transition to open
        } else if(state == IssueState.Open) {
            i.issues[issueHash].state = state;
        }
    }

    /**
     * Returns an array containing bytes32 values, which are used as keys in the issue mapping.
     *
     * @return bytes32[] - Array containing bytes32 values
     */
    function getAllIssues() public view returns (bytes32[] memory) {
        GitIssuesStorage storage i = gitIssues();
        return i.allIssues;
    }

    /**
     * Based on the given parameter an Issie an Issue object is returned.
     *
     * @param userCidHash (bytes32) - Hash over user address and string to locate an Issue
     *
     * @return Issue - Returns an Issue object stored under the given userCidHash
     */
    function getIssue(bytes32 userCidHash) public view returns (Issue memory) {
        GitIssuesStorage storage i = gitIssues();
        require(i.issues[userCidHash].isActive, "Issue with given cid does not exist");
        return i.issues[userCidHash];
    }

    /**
     * Takes a user address and string cid and calculates the keccak256 hash and returns it.
     *
     * @param opener (address) - The address of a user
     * @param cid (string) - The cid as string where the issue is stored
     */
    function getUserCidHash(address opener, string memory cid) public pure returns (bytes32) {
        return keccak256(abi.encode(opener, cid));
    }
}