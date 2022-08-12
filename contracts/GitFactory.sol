// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./Ownable.sol";

import "./registries/GitFactoryContractRegistry.sol";
import "./registries/GitRepoContractRegistry.sol";

contract GitFactory is Ownable {
    // saving the amount of tips received
    uint256 public tips;

    GitRepoContractRegistry public gitRepoContractRegistry;
    GitFactoryContractRegistry public gitFactoryContractRegistry;

    constructor(
        GitRepoContractRegistry _gitRepoContractRegistry,
        GitFactoryContractRegistry _gitFactoryContractRegistry
    ) {
        gitRepoContractRegistry = _gitRepoContractRegistry;
        gitFactoryContractRegistry = _gitFactoryContractRegistry;
    }

    fallback() external payable {
        address facet = gitFactoryContractRegistry.getContractAddress(msg.sig);

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
    
    /**
     * Function in order to collect the collected tips.
     */
    function collectTips() public onlyOwner() {
        // payable(owner()).transfer(tips * 99 / 100);
        payable(owner()).transfer(tips);
        tips = 0;
    }
        
    /**
     * Receive function in order to receive tips. No calldata is set
     */
    receive() external payable {
        tips += msg.value;
    }
}