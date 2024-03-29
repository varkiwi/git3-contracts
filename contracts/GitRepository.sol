// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Jacek Varky <jaca347@protonmail.com> (https://twitter.com/git314)
/******************************************************************************/

import "./GitFactory.sol";
import "./registries/GitRepoContractRegistry.sol";
import "./libraries/LibGitRepository.sol";

contract GitRepository {
    // more arguments are added to this struct
    // this avoids stack too deep errors
    struct RepositoryArgs {
        address owner;
        GitFactory factory;
        string name; 
        uint userIndex;
        uint repoIndex;
        bool forked;
        address forkOrigin;
    }

    constructor(RepositoryArgs memory _args) payable {
        LibGitRepository.setRepositoryInfo(
            _args.factory,
            _args.name,
            _args.userIndex,
            _args.repoIndex, 
            _args.owner,
            _args.forked,
            _args.forkOrigin
        );
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();

        GitFactory factory = ri.factory;
        GitRepoContractRegistry registry = factory.gitRepoContractRegistry();

        address facet = registry.getContractAddress(msg.sig, ri.forked);
        require(facet != address(0), "Diamond: Function does not exist");
        
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

    receive() external payable {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();
        ri.donations += msg.value;
    }
}