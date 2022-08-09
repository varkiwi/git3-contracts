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
        bool callableByFork;
    }

    // terminology taken from EIP-2535
    struct FacetCut {
        address facetAddress;
        bytes4[] functionSelectors;
        bool callableByFork;
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
            contractAddress[freeIndex] = Contract({
                isActive: true,
                contractAddress: _diamondCut[i].facetAddress,
                callableByFork: _diamondCut[i].callableByFork
            });
            for(uint j = 0; j < _diamondCut[i].functionSelectors.length; j++){
                contractAddressIndex[_diamondCut[i].functionSelectors[j]] = Index({isActive: true, index: freeIndex});
            }
            freeIndex += 1;
        }
    }

    /**
     * Takes a function signature and returns the contract address that is responsible for the function.
     *
     * @param _functionSelector {bytes4} - 4 byte signature used to identify the function to be executed
     * @param _forked {bool} - indicating if a repository has been forked
     * @return {address} - the address of the contract that is responsible for the function
     */
    function getContractAddress(bytes4 _functionSelector, bool _forked) public view returns (address) {
        Index storage index = contractAddressIndex[_functionSelector];
        if(!index.isActive) {
            revert('No contract registered');
        }
        if (_forked && !contractAddress[index.index].callableByFork) {
            revert('Forked repository does not support this function');
        }
        return contractAddress[index.index].contractAddress;
    }

    /**
     * Registers a new contract address for a set function signatures.
     *
     * @param _diamondCut {FacetCut} - the set of function signatures and contract address that are to be registered
     *
     */
    function addContractAddress(FacetCut memory _diamondCut) public onlyOwner {
        contractAddress[freeIndex] = Contract({
            isActive: true,
            contractAddress: _diamondCut.facetAddress,
            callableByFork: _diamondCut.callableByFork
        });
        for(uint i = 0; i < _diamondCut.functionSelectors.length; i++){
            contractAddressIndex[_diamondCut.functionSelectors[i]] = Index({isActive: true, index: freeIndex});
        }
        freeIndex += 1;
    }

    /**
     * Deactives a contract address for a set function signatures.
     *
     * @param _functionSelectors {bytes4[]} - the function signatures that are handled by the contract
     */
    function removeContractAddress(bytes4[] calldata _functionSelectors) public onlyOwner {
        for(uint i = 0; i < _functionSelectors.length; i++){
            contractAddressIndex[_functionSelectors[i]].isActive = false;
        }
        contractAddress[contractAddressIndex[_functionSelectors[0]].index].isActive = false;
    }
}