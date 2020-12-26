pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/access/Ownable.sol";

contract GitFactory is Ownable {
    event NewRepositoryCreated(string name, address user);
    
    struct Repository {
        bool isActive;
        string name;
        GitRepository location;
    }
    
    struct ActiveRepo {
        bool isActive;
        uint256 index;
    }

    uint256 public tips;
    
    // mapps from a bytes32 to a repository contract
    // The bytes32 key is the hash over the owner's address and 
    // the repository name
    mapping(bytes32 => Repository) public repositoryList;
    
    // all address that own a repository with that name are in that array
    // if a user types in a repository name, we are able to show all the 
    // users owning a repository with that name
    mapping(string => address[]) public reposUserList;
    
    // mapping of user address to array of repository names
    // with this, we are able to type in a users address and list all his repositories
    mapping(address => string[]) public usersRepoList;
    
    // array with repository names
    // possible use: array = [testRepo, testCcde, awesomeCode]
    // if a user types in test, we are able to show all repository names
    // starting with test
    string[] public repositoryNames;
    
    // mapping from repository name to bool
    // if a repositry is created and that name has not been used yet,
    // the value is set to true and the name is added to repositoryNames
    // If a repository is created and the bollean is true, we don't 
    // have to add it to the repositoryNames array
    mapping(string => ActiveRepo) public activeRepository;

    /**
     * This function is used to create a new repository. By providing a name, a new 
     * GitRepository smart contract is deployed.
     * 
     * @param _repoName (string) - The name of the new repository
     */
    function createRepository(string memory _repoName) public {
        // we has the user address and the repo name to a key 
        bytes32 key = keccak256(abi.encode(msg.sender, _repoName));

        // check if the key has already an active repository
        require(!repositoryList[key].isActive, 'Repository exists already');
        
        // if not, we deploy it
        GitRepository newGitRepo = new GitRepository(
            this,
            _repoName,
            msg.sender,
            reposUserList[_repoName].length,
            usersRepoList[msg.sender].length);
        
        // and set the entry in the mapping
        repositoryList[key] = Repository({
            isActive: true,
            name: _repoName,
            location: newGitRepo
        });
        
        // add the repositie's owner to the array
        reposUserList[_repoName].push(msg.sender);
        // and the repository name to the owner's array
        usersRepoList[msg.sender].push(_repoName);
        
        if (!activeRepository[_repoName].isActive) {
            activeRepository[_repoName].isActive = true;
            activeRepository[_repoName].index = repositoryNames.length;
            repositoryNames.push(_repoName);
        }
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
     * @param _owner (address) - Owner of the repository to be removed
     * @param _repoName (string) - The name of the repository to be removed
     * @param _userIndex (uint256) - The position the of the repositories owner in the reposUserList
     * @param _repoName (uint256) - The position of the repositories name in the usersRepoList
     */
    function removeRepository(address _owner, string memory _repoName, uint256 _userIndex, uint256 _repoIndex) public {
        // we has the user address and the repo name to a key 
        bytes32 key = keccak256(abi.encode(_owner, _repoName));

        // check if the key has already an active repository
        require(repositoryList[key].isActive, "Repository doesn't exist");
        // that works. We will add that later in again
        require(address(repositoryList[key].location) == msg.sender, 'You are not allowed to perform this action');
        
        uint256 reposUserListLenght = reposUserList[_repoName].length;
        if ((_userIndex + 1) == reposUserListLenght) {
            // if the owner's address is at the end of the array, we just pop the value
            reposUserList[_repoName].pop();
        } else {
            // otherwise we remove it and move the last entry to that location.
            delete reposUserList[_repoName][_userIndex];
            // address of the owner of the moving contract
            address lastEntry = reposUserList[_repoName][reposUserListLenght - 1];
            reposUserList[_repoName].pop();
            reposUserList[_repoName][_userIndex] = lastEntry;
            // We also have to update the underlying repository value
            // get the key for the moved repository 
            bytes32 key2 = keccak256(abi.encode(lastEntry, _repoName));
            GitRepository movedGitRepo = repositoryList[key2].location;
            // and update the user index
            movedGitRepo.updateUserIndex(_userIndex);
        }
        
        uint256 usersRepoListLength = usersRepoList[_owner].length;
        if ((_repoIndex + 1) == usersRepoListLength) {
            usersRepoList[_owner].pop();
        } else {
             // otherwise we remove it and move the last entry to that location.
            delete usersRepoList[_owner][_repoIndex];
            string memory lastEntry = usersRepoList[_owner][usersRepoListLength - 1];
            usersRepoList[_owner].pop();
            usersRepoList[_owner][_repoIndex] = lastEntry;
            // We also have to update the underlying repository value
            // get the key for the moved repository 
            bytes32 key2 = keccak256(abi.encode(_owner, lastEntry));
            GitRepository movedGitRepo = repositoryList[key2].location;
            // and update the user index
            movedGitRepo.updateRepoIndex(_repoIndex);
        }
        
        // in case there are no more users having a repositry with this name, 
        // we set the name to false
        if (reposUserList[_repoName].length == 0) {
            activeRepository[_repoName].isActive = false;
            uint256 index = activeRepository[_repoName].index;
            delete repositoryNames[index];
            string memory name = repositoryNames[repositoryNames.length - 1];
            repositoryNames[index] = name;
            activeRepository[name].index = index;
        }
        
        // we still need to deactive the repo and update the entries for the moved repo
        repositoryList[key].isActive = false;
    }
    
    function collectTips() public onlyOwner {
        payable(owner()).transfer(tips * 99 / 100);
        tips = 0;
    }
    
    /**
     * Return an array containing all active repository names.
     * 
     * @return (string[]) - String array containing all active repository names
     */
    function getRepositoryNames() view public returns (string[] memory) {
        return repositoryNames;
    }
    
    /**
     * Returns a string array containing all reposity names belonging to a given user address.
     * 
     * @param _owner (address) - The address of a repository owner
     * 
     * @return (string[]) - Array containing repository names owned by the owner
     */
    function getUsersRepositories(address _owner) view public returns (string[] memory) {
        return usersRepoList[_owner];
    }
    
    /**
     * Returns all user addresses owning a repository by the given name.
     * 
     * @param _repoName (string) - Repository name
     * 
     * @return (address[]) - An array containing all owner addresses having a repository with the given name
     */ 
    function getRepositoriesUserList(string memory _repoName) view public returns (address[] memory) {
        return reposUserList[_repoName];
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
     * Receive function in order to receive tips. No calldata is set
     */
    receive() external payable {
        tips += msg.value;
    }
}


contract GitRepository is Ownable {
    event NewPush(string branch, string Cid);
    event NewIssue(string Cid);
    event ReceivedTip(uint amount, address tipper);
    
    struct Branch {
        bool isActive;
        string headCid;
    }
    
    struct Issue {
        string cid;
        uint bounty;
    }
    
    GitFactory public factory;
    
    // repository name
    string public repoName;
    
    uint public tips;
    // index of the owner in the GitFactory
    // reposUserList.users - used for destroy
    uint private userIndex;
    uint private repoIndex;
    
    // string array containing branch names
    string[] public branchNames;
    // Array which contains Issues structs
    Issue[] public issues;
    
    // mapping from string (branch name) to Branch struct
    mapping(string => Branch) public branches;
    
    /**
     * Constructor for GitRepository
     * 
     * @param _name (string) - The name of the repository 
     * @param _owner (address) - The owner of the repository
     * @param _userIndex (uint) - The index of the owner entry in the GitFactory reposUserList.users array
     * @param _repoIndex (uint) - The index of the repository in the GitFacotry usersRepoList array
     */
    constructor (GitFactory _factory, string memory _name, address _owner, uint _userIndex, uint _repoIndex) public {
        factory = GitFactory(_factory);
        repoName = _name;
        transferOwnership(_owner);
        userIndex = _userIndex;
        repoIndex = _repoIndex;
    }
    
    /**
     * Function to push a new cid for a branch. If branch does not exists, a new one
     * will be created.
     * 
     * @param branch (string) - The name of the branch where a new cid is pushed
     * @param newCid (string) - The new cid which points to the newest commit of the branch
     */
    function push(string memory branch, string memory newCid) public onlyOwner {
        if (bytes(branch).length == 0 || bytes(newCid).length == 0) revert('No branch name provided');
        if (branches[branch].isActive) {
            // set new head cid
            branches[branch].headCid = newCid;
        } else {
            branches[branch] = Branch({
                isActive: true,
                headCid: newCid
            });
            branchNames.push(branch);
        }
        emit NewPush(branch, newCid);
    }
    
    // /**
    //  */
    // function openIssue(string memory cid) public payable {
    //     Issue memory issue = Issue({
    //         cid: cid,
    //         bounty: msg.value
    //     });
    //     issues.push(issue);
    //     emit NewIssue(cid);
    // }
    
    // function updateIssue(string memory cid) public payable {
    //     Issue memory issue = Issue({
    //         cid: cid,
    //         bounty: msg.value
    //     });
    //     issues.push(issue);
    //     emit NewIssue(cid);
    // }
    
    /**
     * The getBranchNames function returns an array contains all
     * created branch names.
     * 
     * @return string[] - String array containing branch names
     */
    function getBranchNames() view public returns (string[] memory) {
        return branchNames;
    }
    
    /**
     * Function to collect the tips.
     */
    function collectTips() public onlyOwner {
        // 1% goes to the factory
        (bool success, ) = address(factory).call{value: tips / 100, gas: 19000}('');
        require(success);
        // 99% to the owner
        payable(owner()).transfer(tips * 99 / 100);
        tips = 0;
    }
    
    /**
     * Used to delete the repository
     */
    function deleteRepository() public onlyOwner {
        // GitFactory f = GitFactory(payable(factory));
        factory.removeRepository(owner(), repoName, userIndex, repoIndex);
        selfdestruct(payable(owner()));
    }
    
    function updateUserIndex(uint256 _newUserIndex) public {
        require(msg.sender == address(factory), 'You are not allowd to perform this action');
        userIndex = _newUserIndex;
    }
    
    function updateRepoIndex(uint256 _newRepoIndex) public {
        require(msg.sender == address(factory), 'You are not allowd to perform this action');
        repoIndex = _newRepoIndex;
    }
    
    
    /**
     * Receive function in order to receive tips. No calldata is set
     */
    receive () external payable {
        emit ReceivedTip(msg.value, msg.sender);
        tips += msg.value;
    } 
}