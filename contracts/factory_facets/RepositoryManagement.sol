// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../GitRepository.sol";

import "../libraries/LibGitFactory.sol";

contract RepositoryManagement {
    event NewRepositoryCreated(string name, address user);

    /**
     * This function is used to create a new repository. By providing a name, a new 
     * GitRepository smart contract is deployed.
     * 
     * @param _repoName (string) - The name of the new repository
     */
    function createRepository(string memory _repoName) public {
        // we have the user address and the repo name to a key 
        bytes32 key = getUserRepoNameHash(msg.sender, _repoName);
        
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();

        // check if the key has already an active repository
        require(!_repoData.repositoryList[key].isActive, 'Repository exists');
        GitRepository newGitRepo = new GitRepository(
            GitRepository.RepositoryArgs({
                owner: msg.sender,
                factory: GitFactory(payable(address(this))),
                name: _repoName,
                userIndex: _repoData.reposUserList[_repoName].length,
                repoIndex: _repoData.usersRepoList[msg.sender].length,
                forked: false,
                forkOrigin: address(0x0)
            }
        ));

        addRepository(key, _repoName, newGitRepo);
        emit NewRepositoryCreated(_repoName, msg.sender);
    }

    /**
     * This functions is used to create a new forked reposiory. By providing a the location
     * of a repository to be forked, a new GitForkedRepository smart contract is deployed.
     *
     * @param location (bytes32) - The location of the repository to be forked
     */
    function forkRepository(bytes32 location) public {
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();

        LibGitFactory.Repository storage toBeForkedRepo = _repoData.repositoryList[location];
        //The user provides the location of the repository to be forked.
        // We are checking if it exists in the first place
        require(toBeForkedRepo.isActive, 'No such repository');
        GitRepositoryManagement gitRepo = GitRepositoryManagement(address(_repoData.repositoryList[location].location));
        address owner;
        (owner, , , , , , ,) = gitRepo.getRepositoryInfo();
        require(owner != msg.sender, "Forking impossible. Repository exists already");
        
        GitRepository newGitRepo = new GitRepository(
            GitRepository.RepositoryArgs({
                owner: msg.sender,
                factory: GitFactory(payable(address(this))),
                name: toBeForkedRepo.name,
                userIndex: _repoData.reposUserList[toBeForkedRepo.name].length,
                repoIndex: _repoData.usersRepoList[msg.sender].length,
                forked: true,
                forkOrigin: address(toBeForkedRepo.location)
            }
        ));        

        GitBranch newGitRepoBranch = GitBranch(address(newGitRepo));
        newGitRepoBranch.readRemoteBranchNamesIntoStorage();

        bytes32 newLocation = getUserRepoNameHash(msg.sender, toBeForkedRepo.name);
        // I guess both contract have to inherit from an abstract class. 
        addRepository(newLocation, toBeForkedRepo.name, newGitRepo);
        emit NewRepositoryCreated(toBeForkedRepo.name, msg.sender);
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
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();

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

    /**
     * Used to remove a repository from the internal 'database'. It takes the owner of the repository, the repository name,
     * the userIndex (describes at what position the owner's address is written in the reposUserList array) and the 
     * repoIndex (describes at what position the repositories name is written in the usersRepoList array). It removes 
     * the values from the arrays and reorganizes them.
     * 
     * @param repoName (string) - The name of the repository to be removed
     * @param userIndex (uint256) - The position the of the repositories owner in the reposUserList
     * @param repoName (uint256) - The position of the repositories name in the usersRepoList
     */
    function removeRepository(
        string memory repoName,
        uint256 userIndex, 
        uint256 repoIndex
    ) public {
        bytes32 key = getUserRepoNameHash(msg.sender, repoName);
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();
        // check if the key has already an active repository
        require(_repoData.repositoryList[key].isActive, "Repository doesn't exist");
        GitRepositoryManagement repoToDelete = GitRepositoryManagement(address(_repoData.repositoryList[key].location));
        uint _userIndex; 
        uint _repoIndex;
        (, , , _userIndex, _repoIndex, , ,) = repoToDelete.getRepositoryInfo();
        require(userIndex == _userIndex, "User Index value is incorrect");
        require(repoIndex == _repoIndex, "Repo Index value is incorrect");

        uint256 reposUserListLenght = _repoData.reposUserList[repoName].length;
        if ((userIndex + 1) == reposUserListLenght) {
            // if the owner's address is at the end of the array, we just pop the value
            _repoData.reposUserList[repoName].pop();
        } else {
            // otherwise we remove it and move the last entry to that location.
            delete _repoData.reposUserList[repoName][userIndex];
            // address of the owner of the moving contract
            address lastEntry = _repoData.reposUserList[repoName][reposUserListLenght - 1];
            _repoData.reposUserList[repoName].pop();
            _repoData.reposUserList[repoName][userIndex] = lastEntry;
            // We also have to update the underlying repository value get the key for the moved repository 
            bytes32 key2 = getUserRepoNameHash(lastEntry, repoName);
            // we require here the GitRepositoryManagement contract with the address of the GitRepository in order
            // to call the updateUserIndex function throught GitRepositry's fallback function
            GitRepositoryManagement movedGitRepo = GitRepositoryManagement(address(_repoData.repositoryList[key2].location));
            // and update the user index
            movedGitRepo.updateUserIndex(userIndex);
        }
        
        uint256 usersRepoListLength = _repoData.usersRepoList[msg.sender].length;
        if ((repoIndex + 1) == usersRepoListLength) {
            _repoData.usersRepoList[msg.sender].pop();
        } else {
             // otherwise we remove it and move the last entry to that location.
            delete _repoData.usersRepoList[msg.sender][repoIndex];
            string memory lastEntry = _repoData.usersRepoList[msg.sender][usersRepoListLength - 1];
            _repoData.usersRepoList[msg.sender].pop();
            _repoData.usersRepoList[msg.sender][repoIndex] = lastEntry;
            // We also have to update the underlying repository value get the key for the moved repository 
            bytes32 key2 = getUserRepoNameHash(msg.sender, lastEntry);
            // we require here the GitRepositoryManagement contract with the address of the GitRepository in order
            // to call the updateRepoIndex function throught GitRepositry's fallback function
            GitRepositoryManagement movedGitRepo = GitRepositoryManagement(address(_repoData.repositoryList[key2].location));
            // and update the user index
            movedGitRepo.updateRepoIndex(repoIndex);
        }
        
        // in case there are no more users having a repositry with this name, we set the name to false
        if (_repoData.reposUserList[repoName].length == 0) {
            _repoData.activeRepository[repoName].isActive = false;
            uint256 index = _repoData.activeRepository[repoName].index;
            if (index != _repoData.repositoryNames.length - 1) {
                delete _repoData.repositoryNames[index];
                string memory name = _repoData.repositoryNames[_repoData.repositoryNames.length - 1];
                _repoData.repositoryNames[index] = name;
                _repoData.activeRepository[name].index = index;
            }
            _repoData.repositoryNames.pop();
        }
        
        // we still need to deactive the repo and update the entries for the moved repo
        _repoData.repositoryList[key].isActive = false;
    }

    /**
     * Return an array containing all active repository names.
     * 
     * @return (string[]) - String array containing all active repository names
     */
    function getRepositoryNames() view public returns (string[] memory) {
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();
        return _repoData.repositoryNames;
    }

    /**
     * Returns a string array containing all reposity names belonging to a given user address.
     * 
     * @param _owner (address) - The address of a repository owner
     * 
     * @return (string[]) - Array containing repository names owned by the owner
     */
    function getUsersRepositories(address _owner) view public returns (string[] memory) {
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();
        return _repoData.usersRepoList[_owner];
    }

    /**
     * Returns all user addresses owning a repository by the given name.
     * 
     * @param _repoName (string) - Repository name
     * 
     * @return (address[]) - An array containing all owner addresses having a repository with the given name
     */ 
    function getRepositoriesUserList(string memory _repoName) view public returns (address[] memory) {
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();
        return _repoData.reposUserList[_repoName];
    }

    /**
     * Returns the keccak256 hash generated over a user's address and a repository name.
     * 
     * @param _owner (address) - The address of a repository owner
     * @param _repoName (string) - The name of a repository 
     * 
     * @return (bytes32) - The keccak256(_owner, _repoName) hash 
     */
    function getUserRepoNameHash(address _owner, string memory _repoName) pure public returns (bytes32) {
        return keccak256(abi.encode(_owner, _repoName));
    }

    /**
     * This function returns a Repository struct which contains the address of the contract representing a 
     * git repository and if it is active.
     * 
     * @param location (bytes32) - Location of the git repository information. Location := keccak(owner, repo name)
     * 
     * @return (LibGitFactory.Repository) - The repository struct
     */
    function getRepository(bytes32 location) view public returns (LibGitFactory.Repository memory) {
        LibGitFactory.Repositories storage _repoData = LibGitFactory.repositoriesInformation();
        return _repoData.repositoryList[location];
    }
}