// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "../GitFactory.sol";
import "../GitRepository.sol";

library LibGitFactory {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    bytes32 constant FACTORY_REPOSITORIES_POSITION = keccak256("git.factory.repositories");

    struct Repository {
        bool isActive;
        string name;
        GitRepository location;
    }

    struct ActiveRepo {
        bool isActive;
        uint256 index;
    }

    struct Repositories {
        // mapps from a bytes32 to a repository contract
        // The bytes32 key is the hash over the owner's address and 
        // the repository name
        mapping(bytes32 => Repository) repositoryList;
        
        // all address that own a repository with that name are in that array
        // if a user types in a repository name, we are able to show all the 
        // users owning a repository with that name
        mapping(string => address[]) reposUserList;
        
        // mapping of user address to array of repository names
        // with this, we are able to type in a users address and list all his repositories
        mapping(address => string[]) usersRepoList;
        
        // array with repository names
        // possible use: array = [testRepo, testCcde, awesomeCode]
        // if a user types in test, we are able to show all repository names
        // starting with test
        string[] repositoryNames;
        
        // mapping from repository name to bool
        // if a repositry is created and that name has not been used yet,
        // the value is set to true and the name is added to repositoryNames
        // If a repository is created and the bollean is true, we don't 
        // have to add it to the repositoryNames array
        mapping(string => ActiveRepo) activeRepository;
    }

    function repositoriesInformation() internal pure returns (Repositories storage ri) {
        bytes32 position = FACTORY_REPOSITORIES_POSITION;
        assembly {
            ri.slot := position
        }
    }
}