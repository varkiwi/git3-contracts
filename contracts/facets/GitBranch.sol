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
        mapping(string => BranchStatus) branchStatus;
    }

    struct Branch {
        bool isActive;
        string headCid;
    }

    struct BranchStatus {
        bool forked_branch_update;
    }
    
    bytes32 constant GIT_BRANCHES_STORAGE_POSITION = keccak256("diamond.standard.git.branch");
    
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

    function gitRepositoryInformation() internal pure returns(LibGitRepository.RepositoryInformation storage ds) {
        bytes32 position = LibGitRepository.REPO_INFO_POSITION;
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
        LibGitRepository.RepositoryInformation storage gri = gitRepositoryInformation();
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

        if (gri.forked) {
            // if the repository has been forked, we need to update the forked_branch_update flag
            gitBranchStorage.branchStatus[branch].forked_branch_update = true;
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
        LibGitRepository.RepositoryInformation storage repoInfo = gitRepositoryInformation();
        GitBranchStorage storage gitBranchStorage = gitBranches();
        if (repoInfo.forked) {
            // if the repo is forked, we have to check if the branch has been updated. If so, we would return 
            // the branch data from the local storage.
            // In case the branch was not updated, we need to get the data from the fork origin.   
            if (gitBranchStorage.branchStatus[branchName].forked_branch_update) {
                return gitBranchStorage.branches[branchName];
            }
            GitBranch forkOrigin = GitBranch(repoInfo.forkOrigin);
            return forkOrigin.getBranch(branchName);
        }
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

    /**
     * In case this is a forked repository, it is going to read the branch names from the fork origin.
     * This method should only be used once, when the repository is forked.
     */
     // TODO: modidifer onlyFanctory
    function readRemoteBranchNamesIntoStorage() public {
        LibGitRepository.RepositoryInformation storage repoInfo = gitRepositoryInformation();
        // we only execute the code if the repository is forked. If it is not forked, we don't have to get the 
        // remote branch names.
        if (repoInfo.forked && !repoInfo.readOriginBranches) {
            GitBranch forkOrigin = GitBranch(repoInfo.forkOrigin);

            GitBranchStorage storage gitBranchStorage = gitBranches();
            string[] memory remoteBranchNames = forkOrigin.getBranchNames();

            for (uint256 i = 0; i < remoteBranchNames.length; i++) {
                gitBranchStorage.branchNames.push(remoteBranchNames[i]);
            }
            repoInfo.readOriginBranches = true;
        }
    }
}