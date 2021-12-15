// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../GitFactory.sol";
import "../libraries/LibGitRepository.sol";

contract GitRepositoryManagement {
    // Returns the struct from a specified position in contract storage
    // ds is short for DiamondStorage
    function repositoryInformation() internal pure returns(LibGitRepository.RepositoryInformation storage ds) {
        // Specifies a random position from a hash of a string
        // bytes32 storagePosition = keccak256("diamond.storage.LibA");
        // Set the position of our struct in contract storage
        bytes32 position = LibGitRepository.REPO_INFO_POSITION;
        assembly {
            ds.slot := position
        }
    }


    function getRepositoryInfo() public view returns (address contractOwner, GitFactory factory, string memory name, uint userIndex, uint repoIndex, uint donations) {
        LibGitRepository.RepositoryInformation storage ri = repositoryInformation();
        return (ri.contractOwner, ri.factory, ri.name, ri.userIndex, ri.repoIndex, ri.donations);
    }

    function updateUserIndex(uint256 _newUserIndex) public {
        LibGitRepository.RepositoryInformation storage ri = repositoryInformation();
        require(msg.sender == address(ri.factory), 'You are not allowd to perform this action');
        ri.userIndex = _newUserIndex;
    }
    
    function updateRepoIndex(uint256 _newRepoIndex) public {
        LibGitRepository.RepositoryInformation storage ri = repositoryInformation();
        require(msg.sender == address(ri.factory), 'You are not allowd to perform this action');
        ri.repoIndex = _newRepoIndex;
    }  
}