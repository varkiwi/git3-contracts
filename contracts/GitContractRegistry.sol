// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

contract GitContractRegistry {
    struct Index {
        bool isActive;
        uint256 index;
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
    mapping (uint256 => address) public contractAddress;

    constructor(FacetCut[] memory _diamondCut) {
        freeIndex = 0;
        for(uint i = 0; i < _diamondCut.length; i++){
            contractAddress[freeIndex] = _diamondCut[i].facetAddress;
            for(uint j = 0; j < _diamondCut[i].functionSelectors.length; j++){
                contractAddressIndex[_diamondCut[i].functionSelectors[j]] = Index({isActive: true, index: freeIndex});
            }
            freeIndex += 1;
        }
    }

    function getContractAddress(bytes4 _functionSelector) public view returns (address) {
        Index storage index = contractAddressIndex[_functionSelector];
        if(!index.isActive) {
            revert();
        }
        return contractAddress[index.index];
    }

    function addContractAddress(address _contractAddress, bytes4[] calldata _functionSelectors) public {
        contractAddress[freeIndex] = _contractAddress;
        for(uint i = 0; i < _functionSelectors.length; i++){
            contractAddressIndex[_functionSelectors[i]] = Index({isActive: true, index: freeIndex});
        }
        freeIndex += 1;
    }

}