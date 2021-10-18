// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../GitFactory.sol";
import "../libraries/LibGitRepository.sol";

contract GitTips {
    bytes32 constant GIT_ISSUES_STORAGE_POSITION = keccak256("diamond.standard.git.tips");
    // bytes32 constant REPO_INFORMATION_STORAGE_POSITION = keccak256("diamond.standard.git.repositoryInformation");

    // This struct contains state variables we care about.
    // struct RepositoryInformation {
    //     // owner of the contract
    //     address contractOwner;
    // }

    // Returns the struct from a specified position in contract storage
    // ds is short for DiamondStorage
    // function repositoryInformation() internal pure returns(RepositoryInformation storage ds) {
    //     // Specifies a random position from a hash of a string
    //     // bytes32 storagePosition = keccak256("diamond.storage.LibA");
    //     // Set the position of our struct in contract storage
    //     bytes32 position = REPO_INFORMATION_STORAGE_POSITION;
    //     assembly {
    //         ds.slot := position
    //     }
    // }

    // function getRepositoryInfo() public view returns (address contractOwner, GitFactory factory, string memory name, uint userIndex, uint repoIndex) {
    //     RepositoryInformation storage ri = repositoryInformation();
    //     return (ri.contractOwner, ri.factory, ri.name, ri.userIndex, ri.repoIndex);
    // }

    // Returns the struct from a specified position in contract storage
    // ds is short for DiamondStorage
    // function gitIssues() internal pure returns(GitIssuesStorage storage issues) {
    //     // Specifies a random position from a hash of a string
    //     // bytes32 storagePosition = keccak256("diamond.storage.LibA");
    //     // Set the position of our struct in contract storage
    //     bytes32 position = GIT_ISSUES_STORAGE_POSITION;
    //     assembly {
    //         issues.slot := position
    //     }
    // }

    function collectTips() public {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();
        require(msg.sender == address(ri.contractOwner), 'You are not allowd to perform this action');
        uint donation = ri.donations;
        ri.donations = 0;
        payable(ri.contractOwner).transfer(donation);
    }

    function getTips() public view returns (uint) {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();
        return ri.donations;
    }

    /**
     * The open issue function allows a user to open or reopen an already closed issue by providing a cid. The user 
     * is able to add a bounty to an issue.
     * 
     * @param issueCid (string) - CID of issue location
     */
    // function openIssue(string memory issueCid) public payable {
    //     GitIssuesStorage storage i = gitIssues();
    //     bytes32 userCidHash = getUserCidHash(msg.sender, issueCid);
    //     Issue storage issue = i.issues[userCidHash];
    //     // if there exists already an issue but the state is closed, it is reopened
    //     if(issue.isActive && issue.state == IssueState.Closed) {
    //         issue.state = IssueState.Open;
    //     // if no issue exists, a new one is opened
    //     } else if (!issue.isActive){
    //         issue.isActive = true;
    //         issue.state = IssueState.Open;
    //         issue.cid = issueCid;
    //         issue.bounty = msg.value;
    //         issue.opener = msg.sender;
    //         issue.placeInList = i.allIssues.length;

    //         i.issues[userCidHash] = issue;
    //         i.allIssues.push(userCidHash);
    //         emit NewIssue(issueCid);
    //     // otherwise just revert
    //     } else {
    //         revert("Open issue exists already");
    //     }
    // }
}