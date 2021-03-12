// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "../GitRepository.sol";
import "../facets/GitRepositoryManagement.sol";

library LibGitFactory {
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

    /**
     * This function is used to create a new repository. By providing a name, a new 
     * GitRepository smart contract is deployed.
     * 
     * @param self (Repositories) - The struct which contains all repository related inforation
     * @param key (bytes32) - Hash of user address and repository name
     * @param repoName (string) - The name of the new repository
     * @param newGitRepo (GitRepository) - Address of the newly deployed GitRepostory
     * @param owner (address) - Address of the owner of the new GitRepository
     */
    function addRepository(
        Repositories storage self,
        bytes32 key,
        string memory repoName,
        GitRepository newGitRepo,
        address owner
    ) internal {
        self.repositoryList[key] = Repository({
            isActive: true,
            name: repoName,
            location: newGitRepo
        });
        
        // add the repositie's owner to the array
        self.reposUserList[repoName].push(owner);
        // and the repository name to the owner's array
        self.usersRepoList[owner].push(repoName);
        
        if (!self.activeRepository[repoName].isActive) {
            self.activeRepository[repoName].isActive = true;
            self.activeRepository[repoName].index = self.repositoryNames.length;
            self.repositoryNames.push(repoName);
        }
    }

    /**
     * Used to remove a repository from the internal 'database'. It takes the owner of the repository, the repository name,
     * the userIndex (describes at what position the owner's address is written in the reposUserList array) and the 
     * repoIndex (describes at what position the repositories name is written in the usersRepoList array). It removes 
     * the values from the arrays and reorganizes them.
     * 
     * This function should be called only by GitRepository contracts.
     * 
     * @param self (Repositories) - The struct which contains all repository related inforation
     * @param owner (address) - Owner of the repository to be removed
     * @param repoName (string) - The name of the repository to be removed
     * @param userIndex (uint256) - The position the of the repositories owner in the reposUserList
     * @param repoName (uint256) - The position of the repositories name in the usersRepoList
     */
    function removeRepository(
        Repositories storage self,
        address owner,
        string memory repoName,
        uint256 userIndex, 
        uint256 repoIndex
    ) internal {
        bytes32 key = getUserRepoNameHash(owner, repoName);

        // check if the key has already an active repository
        require(self.repositoryList[key].isActive, "Repository doesn't exist");
        GitRepositoryManagement repoToDelete = GitRepositoryManagement(address(self.repositoryList[key].location));
        uint _userIndex; 
        uint _repoIndex;
        (, , , _userIndex, _repoIndex) = repoToDelete.getRepositoryInfo();
        require(userIndex == _userIndex, "User Index value is not correct");
        require(repoIndex == _repoIndex, "Repo Index value is not correct");

        uint256 reposUserListLenght = self.reposUserList[repoName].length;
        if ((userIndex + 1) == reposUserListLenght) {
            // if the owner's address is at the end of the array, we just pop the value
            self.reposUserList[repoName].pop();
        } else {
            // otherwise we remove it and move the last entry to that location.
            delete self.reposUserList[repoName][userIndex];
            // address of the owner of the moving contract
            address lastEntry = self.reposUserList[repoName][reposUserListLenght - 1];
            self.reposUserList[repoName].pop();
            self.reposUserList[repoName][userIndex] = lastEntry;
            // We also have to update the underlying repository value get the key for the moved repository 
            bytes32 key2 = getUserRepoNameHash(lastEntry, repoName);
            // we require here the GitRepositoryManagement contract with the address of the GitRepository in order
            // to call the updateUserIndex function throught GitRepositry's fallback function
            GitRepositoryManagement movedGitRepo = GitRepositoryManagement(address(self.repositoryList[key2].location));
            // and update the user index
            movedGitRepo.updateUserIndex(userIndex);
        }
        
        uint256 usersRepoListLength = self.usersRepoList[owner].length;
        if ((repoIndex + 1) == usersRepoListLength) {
            self.usersRepoList[owner].pop();
        } else {
             // otherwise we remove it and move the last entry to that location.
            delete self.usersRepoList[owner][repoIndex];
            string memory lastEntry = self.usersRepoList[owner][usersRepoListLength - 1];
            self.usersRepoList[owner].pop();
            self.usersRepoList[owner][repoIndex] = lastEntry;
            // We also have to update the underlying repository value get the key for the moved repository 
            bytes32 key2 = getUserRepoNameHash(owner, lastEntry);
            // we require here the GitRepositoryManagement contract with the address of the GitRepository in order
            // to call the updateRepoIndex function throught GitRepositry's fallback function
            GitRepositoryManagement movedGitRepo = GitRepositoryManagement(address(self.repositoryList[key2].location));
            // and update the user index
            movedGitRepo.updateRepoIndex(repoIndex);
        }
        
        // in case there are no more users having a repositry with this name, we set the name to false
        if (self.reposUserList[repoName].length == 0) {
            self.activeRepository[repoName].isActive = false;
            uint256 index = self.activeRepository[repoName].index;
            if (index != self.repositoryNames.length - 1) {
                delete self.repositoryNames[index];
                string memory name = self.repositoryNames[self.repositoryNames.length - 1];
                self.repositoryNames[index] = name;
                self.activeRepository[name].index = index;
            }
            self.repositoryNames.pop();
        }
        
        // we still need to deactive the repo and update the entries for the moved repo
        self.repositoryList[key].isActive = false;
    }

    /**
     * Returns the keccak256 hash generated over a user's address and a repository name.
     * 
     * @param _owner (address) - The address of a repository owner
     * @param _repoName (string) - The name of a repository 
     * 
     * @return (bytes32) - The keccak256(_owner, _repoName) hash 
     */
    function getUserRepoNameHash(address _owner, string memory _repoName) pure internal returns (bytes32) {
        return keccak256(abi.encode(_owner, _repoName));
    }

    function getRepository(Repositories storage self, bytes32 location) view internal returns (Repository memory) {
        return self.repositoryList[location];
    }

    /**
     * Returns all user addresses owning a repository by the given name.
     * 
     * @param _repoName (string) - Repository name
     * 
     * @return (address[]) - An array containing all owner addresses having a repository with the given name
     */ 
    function getRepositoriesUserList(Repositories storage self, string memory _repoName) view internal returns (address[] memory) {
        return self.reposUserList[_repoName];
    }
}