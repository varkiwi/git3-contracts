// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../GitFactory.sol";
import "../libraries/LibGitRepository.sol";
// This is a temporary contract for testing the diamondCut replacement function
// Here from the standear on how replacepemnt works
// To replace functions create a FacetCut struct with facetAddress set to the facet that has the replacement functions 
// and functionSelectors set with the function selectors to replace. Set the action enum to Replace.

contract GitRepositoryManagementUpdated {

    struct FacetAddressAndSelectorPosition {
        address facetAddress;
        uint16 selectorPosition;
    }

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
}