// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../GitFactory.sol";
import "./GitRepositoryManagement.sol";
import "../libraries/LibGitRepository.sol";

contract GitBranch {
    event NewPush(string branch, string Cid);
    
    struct GitBranchStorage {
        mapping(string => Branch) branches;
        // string array containing branch names
        string[] branchNames;
        GitFactory factory;
    }

    struct Branch {
        bool isActive;
        string headCid;
    }
    
    bytes32 constant GIT_BRANCHES_STORAGE_POSITION = keccak256("diamond.standard.git.branch");
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.git.repositoryInformation");
    
    // Returns the struct from a specified position in contract storage
    // ds is short for DiamondStorage
    function gitBranches() internal pure returns(GitBranchStorage storage branches) {
        // Specifies a random position from a hash of a string
        // bytes32 storagePosition = keccak256("diamond.storage.LibA");
        // Set the position of our struct in contract storage
        bytes32 position = GIT_BRANCHES_STORAGE_POSITION;
        assembly {
            branches.slot := position
        }
    }

    function gitRepositoryInformation() internal pure returns(GitRepositoryManagement.RepositoryInformation storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
    
    /**
     * Function to push a new cid for a branch. If branch does not exists, a new one
     * will be created.
     * 
     * @param branch (string) - The name of the branch where a new cid is pushed
     * @param newCid (string) - The new cid which points to the newest commit of the branch
     */
    function push(string memory branch, string memory newCid) public {
        require(bytes(branch).length > 0, "No branch name provided");
        require(bytes(newCid).length > 0, "No CID provided");
        GitRepositoryManagement.RepositoryInformation storage gri = gitRepositoryInformation();
        require(gri.contractOwner == msg.sender, "Only owner of repository is able to push");

        GitBranchStorage storage gitBranchStorage = gitBranches();
        if (gitBranchStorage.branches[branch].isActive) {
            // set new head cid
            gitBranchStorage.branches[branch].headCid = newCid;
        } else {
            gitBranchStorage.branches[branch] = Branch({
                isActive: true,
                headCid: newCid
            });
            gitBranchStorage.branchNames.push(branch);
        }
        emit NewPush(branch, newCid);
    }

    /**
     * The getBranch function returns the Branch struct saved under the given branchName parameter.
     *
     * @param branchName (string) - The branchName to look up for
     *
     * @return Branch - Returns the Branch struct saved under the branchName parameter
     */
    function getBranch(string calldata branchName) view public returns (Branch memory) {
        GitBranchStorage storage gitBranchStorage = gitBranches();
        return gitBranchStorage.branches[branchName];
    }

    /**
     * The getBranchNames function returns an array contains all
     * created branch names.
     * 
     * @return string[] - String array containing branch names
     */
    function getBranchNames() view public returns (string[] memory) {
        GitBranchStorage storage gitBranchStorage = gitBranches();
        return gitBranchStorage.branchNames;
    }
}