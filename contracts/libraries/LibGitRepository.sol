// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "../GitFactory.sol";

library LibGitRepository {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    bytes32 constant REPO_INFO_POSITION = keccak256("diamond.standard.git.repositoryInformation");

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
}