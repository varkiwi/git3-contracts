// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./Ownable.sol";

contract GitContractRegistry is Ownable {
    struct Index {
        bool isActive;
        uint256 index;
    }

    struct Contract {
        bool isActive;
        address contractAddress;
    }

    // terminology taken from EIP-2535
    struct FacetCut {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    uint256 freeIndex;
    // mapping from function signature to contract address index
    mapping (bytes4 => Index) public contractAddressIndex;
    // the index is used to identiy the contract address. Why this step? So that we only have to 
    // replace one address in case there is an update.
    mapping (uint256 => Contract) public contractAddress;

    constructor(FacetCut[] memory _diamondCut) {
        freeIndex = 0;
        for(uint i = 0; i < _diamondCut.length; i++){
            contractAddress[freeIndex] = Contract({isActive: true, contractAddress: _diamondCut[i].facetAddress});
            for(uint j = 0; j < _diamondCut[i].functionSelectors.length; j++){
                contractAddressIndex[_diamondCut[i].functionSelectors[j]] = Index({isActive: true, index: freeIndex});
            }
            freeIndex += 1;
        }
    }

    /**
     * Takes a function signature and returns the contract address that is responsible for the function.
     *
     * @param _functionSignature {bytes4} - 4 byte signature used to identify the function to be executed
     * @return {address} - the address of the contract that is responsible for the function
     */
    function getContractAddress(bytes4 _functionSelector) public view returns (address) {
        Index storage index = contractAddressIndex[_functionSelector];
        if(!index.isActive) {
            revert('No contract registered');
        }
        return contractAddress[index.index].contractAddress;
    }

    /**
     * Registers a new contract address for a set function signatures.
     *
     * @param _contractAddress {address} - the address of the contract that is responsible for the function
     * @param _functionSelectors {bytes4[]} - the function signatures that are handled by the contract
     */
    function addContractAddress(address _contractAddress, bytes4[] calldata _functionSelectors) public onlyOwner {
        contractAddress[freeIndex] = Contract({isActive: true, contractAddress: _contractAddress});
        for(uint i = 0; i < _functionSelectors.length; i++){
            contractAddressIndex[_functionSelectors[i]] = Index({isActive: true, index: freeIndex});
        }
        freeIndex += 1;
    }

    /**
     * Deactives a contract address for a set function signatures.
     *
     * @param _contractAddress {address} - the address of the contract that is responsible for the function
     * @param _functionSelectors {bytes4[]} - the function signatures that are handled by the contract
     */
    function removeContractAddress(bytes4[] calldata _functionSelectors) public onlyOwner {
        for(uint i = 0; i < _functionSelectors.length; i++){
            contractAddressIndex[_functionSelectors[i]].isActive = false;
        }
        contractAddress[contractAddressIndex[_functionSelectors[0]].index].isActive = false;
    }

}