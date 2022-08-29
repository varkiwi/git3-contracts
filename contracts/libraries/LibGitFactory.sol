// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "../GitFactory.sol";
import "../GitRepository.sol";

library LibGitFactory {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    bytes32 constant FACTORY_REPOSITORIES_POSITION = keccak256("git.factory.repositories");
    bytes32 constant FACTORY_INFORMATION_POSITION = keccak256("git.factory.information");

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

    struct FactoryInformation {
        address owner;
        uint tips;
    }

    function setFactoryInfo(
        address _newOwner
    ) internal {
        FactoryInformation storage fi = factoryInformation();
        fi.owner = _newOwner;
        fi.tips = 0;
        emit OwnershipTransferred(address(0x0), _newOwner);
    }

    function repositoriesInformation() internal pure returns (Repositories storage ri) {
        bytes32 position = FACTORY_REPOSITORIES_POSITION;
        assembly {
            ri.slot := position
        }
    }

    function factoryInformation() internal pure returns (FactoryInformation storage fi) {
        bytes32 position = FACTORY_INFORMATION_POSITION;
        assembly {
            fi.slot := position
        }
    }

    /**
     * This function is used to create a new repository. By providing a name, a new 
     * GitRepository smart contract is deployed.
     * 
     * @param key (bytes32) - Hash of user address and repository name
     * @param repoName (string) - The name of the new repository
     * @param newGitRepo (GitRepository) - Address of the newly deployed GitRepostory
     */
    function addRepository(
        bytes32 key,
        string memory repoName,
        GitRepository newGitRepo
    ) internal {
        // LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();
        Repositories storage _repoData = repositoriesInformation();

        _repoData.repositoryList[key] = LibGitFactory.Repository({
            isActive: true,
            name: repoName,
            location: newGitRepo
        });
        
        // add the repositie's owner to the array
        _repoData.reposUserList[repoName].push(msg.sender);
        // and the repository name to the owner's array
        _repoData.usersRepoList[msg.sender].push(repoName);
        
        if (!_repoData.activeRepository[repoName].isActive) {
            _repoData.activeRepository[repoName].isActive = true;
            _repoData.activeRepository[repoName].index = _repoData.repositoryNames.length;
            _repoData.repositoryNames.push(repoName);
        }
    }
}