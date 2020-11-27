pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/access/Ownable.sol";

contract GitFactory is Ownable {
    struct Repo {
        GitRepository repo;
        bool isSet;
    }
    
    
    mapping(string => Repo) public gitRepositories;
    
    event CreatedNewRepository(string Name, GitRepository Address);
    
    constructor() public Ownable() {}
    
    function createRepository(string memory name) public {
        require(gitRepositories[name].isSet == false, "Repository exists already");
        GitRepository newGitRepo = new GitRepository(name, msg.sender);
        gitRepositories[name].repo = newGitRepo;
        gitRepositories[name].isSet = true;
        emit CreatedNewRepository(name, newGitRepo);
    }
}

contract GitRepository is Ownable {
    event NewPush(string Cid);
    event NewIssue(string Cid);
    
    struct Issue {
        string cid;
        uint bounty;
    }

    // repository name
    string public repoName;
    string[] public cidHistory;
    // cid to newest repo
    string public headCid;
    Issue[] public issues;
    
    mapping(string => bool) public pushHistory;
    // mapping(string => Issue) public openIssues;
    
    constructor (string memory name, address owner) public Ownable() {
        repoName = name;
        transferOwnership(owner);
    }
    
    function push(string memory newCid) public onlyOwner {
        if (pushHistory[newCid] == false) {
            pushHistory[newCid] = true;
            cidHistory.push(newCid);
            headCid = newCid;
            emit NewPush(newCid);
        }
    }
    
    function getCidHistory() public view returns (string[] memory) {
        return cidHistory;
    }

    function openIssue(string memory cid) public payable {
        Issue memory issue = Issue({
            cid: cid,
            bounty: msg.value
        });
        issues.push(issue);
        emit NewIssue(cid);
    }
    
    receive () external payable {}
}
