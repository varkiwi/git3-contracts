// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamond Standard: https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/
import "../interfaces/IDiamondCut.sol";
import "../GitFactory.sol";

library LibGitRepository {
    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");
    bytes32 constant REPO_INFO_POSITION = keccak256("diamond.standard.git.repositoryInformation");

    struct FacetAddressAndSelectorPosition {
        address facetAddress;
        uint16 selectorPosition;
    }

    struct RepositoryInformation {
        // owner of the contract
        address contractOwner;
        // address of the git factory
        GitFactory factory;
        // name of the repository
        string name;
        // the position the of the repositories owner in the reposUserList
        uint userIndex;
        // the position of the repositories name in the usersRepoList
        uint repoIndex;
        uint donations;
    }

    function repositoryInformation() internal pure returns (RepositoryInformation storage ri) {
        bytes32 position = REPO_INFO_POSITION;
        assembly {
            ri.slot := position
        }
    }

    function setRepositoryInfo(GitFactory factory, string memory name, uint userIndex, uint repoIndex, address _newOwner) internal {
        RepositoryInformation storage ri = repositoryInformation();
        ri.factory = factory;
        ri.name = name;
        ri.userIndex = userIndex;
        ri.repoIndex = repoIndex;

        address previousOwner = ri.contractOwner;
        ri.contractOwner = _newOwner;
        ri.donations = 0;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = repositoryInformation().contractOwner;
    }
}