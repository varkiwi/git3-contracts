// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./GitRepositoryDeployer.sol";
import "./GitRepository.sol";
import "./facets/DiamondCutFacet.sol";
import "./Ownable.sol";
import "./interfaces/IDiamondCut.sol";
import "./libraries/LibGitFactory.sol";

contract GitFactory is Ownable {
    event NewRepositoryCreated(string name, address user);

    // saving the amount of tips received
    uint256 public tips;

    // address of deplyer contract
    GitRepositoryDeployer private deployer;

    // Struct from LibGitFactory, which stores all repository related information
    LibGitFactory.Repositories private _repoData;
    
    // array of FacetCuts structs
    IDiamondCut.FacetCut[] public diamondCuts;

    constructor(IDiamondCut.FacetCut[] memory _diamondCut, GitRepositoryDeployer d) {
        for(uint i = 0; i < _diamondCut.length; i++){
            diamondCuts.push(_diamondCut[i]);
        }
        deployer = d;
    }

    /**
     * This function is used to create a new repository. By providing a name, a new 
     * GitRepository smart contract is deployed.
     * 
     * @param _repoName (string) - The name of the new repository
     */
    function createRepository(string memory _repoName) public {
        // we have the user address and the repo name to a key 
        bytes32 key = LibGitFactory.getUserRepoNameHash(msg.sender, _repoName);

        // check if the key has already an active repository
        require(!_repoData.repositoryList[key].isActive, 'Repository exists already');
        
        // deploying new contract
        GitRepository newGitRepo = deployer.deployContract(
            diamondCuts, 
            GitRepository.RepositoryArgs({
                owner: msg.sender,
                factory: this,
                name: _repoName,
                userIndex: _repoData.reposUserList[_repoName].length,
                repoIndex: _repoData.usersRepoList[msg.sender].length
            })
        );

        LibGitFactory.addRepository(_repoData, key, _repoName, newGitRepo, msg.sender);
        emit NewRepositoryCreated(_repoName, msg.sender);
    }

    /**
     * Used to remove a repository from the internal 'database'. It takes the owner of the repository, the repository name,
     * the userIndex (describes at what position the owner's address is written in the reposUserList array) and the 
     * repoIndex (describes at what position the repositories name is written in the usersRepoList array). It removes 
     * the values from the arrays and reorganizes them.
     * 
     * This function should be called only by GitRepository contracts.
     * 
     * @param _repoName (string) - The name of the repository to be removed
     * @param _userIndex (uint256) - The position the of the repositories owner in the reposUserList
     * @param _repoName (uint256) - The position of the repositories name in the usersRepoList
     */
    function removeRepository(string memory _repoName, uint256 _userIndex, uint256 _repoIndex) public {
        LibGitFactory.removeRepository(_repoData, msg.sender, _repoName, _userIndex, _repoIndex);
    }
    
    /**
     * Function in order to collect the collected tips.
     */
    function collectTips() public onlyOwner() {
        // payable(owner()).transfer(tips * 99 / 100);
        payable(owner()).transfer(tips);
        tips = 0;
    }
    
    /**
     * Return an array containing all active repository names.
     * 
     * @return (string[]) - String array containing all active repository names
     */
    function getRepositoryNames() view public returns (string[] memory) {
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
        return LibGitFactory.getRepositoriesUserList(_repoData, _repoName);
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
        return LibGitFactory.getUserRepoNameHash(_owner, _repoName);
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
        return LibGitFactory.getRepository(_repoData, location);
    }

    /**
     * Allows to add a facet contract which is used to add to every new created git repository contract.
     *
     * @param _diamondCut (IDiamondCut.FacetCut) - FacetCut struct with the information of the new facet contract
     */
    function addFacet(IDiamondCut.FacetCut memory _diamondCut) public onlyOwner {
        diamondCuts.push(_diamondCut);
    }

    /**
     * Allows to remove a facet contract. Whenever a new git repository is created, this facet won't be added to it.
     * All git repositorys which had been deployed before this function call, will still have the facet. It needs to be
     * removed manually.
     *
     * @param index (uint) - Index of the facet which should be reomved from the diamondCuts list
     */
    function removeFacet(uint index) public onlyOwner {
        require(index < diamondCuts.length, "Index out of bounds");
        if (index == diamondCuts.length - 1) {
            diamondCuts.pop();
        } else {
            diamondCuts[index] = diamondCuts[diamondCuts.length - 1];
            diamondCuts.pop();
        }
    }

    /**
     * This function is used to replace a facet contract at the given index in the diamondCuts list.
     *
     * @param _diamondCut (IDiamondCut.FacetCut) - The new facet contract information
     * @param index (uint) - The index in the diamondCuts list which is replaced with the new facet
     */
    function replaceFacet(IDiamondCut.FacetCut memory _diamondCut, uint index) public onlyOwner {
        require(index < diamondCuts.length, "Index out of bounds");
        diamondCuts[index] = _diamondCut;
    }

    /**
     * This function is used to updated the facets of already deployed Git Repositories
     *
     * @param reposAddress (address) - The address of the git repository to be updated
     * @param _diamondCut (IDiamondCut.FacetCut) - The new facet contract information
     * @param _init //TODO: Check out this parameter in regards the diamond spec
     * @param _calldata //TODO: Check out this parameter in regards the diamond spec
     */
    function updateRepositoriesFacets(
        address reposAddress,
        IDiamondCut.FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) public onlyOwner {
        DiamondCutFacet repo = DiamondCutFacet(reposAddress);
        repo.diamondCut(_diamondCut, _init, _calldata);
    }
    
    /**
     * Receive function in order to receive tips. No calldata is set
     */
    receive() external payable {
        tips += msg.value;
    }
}