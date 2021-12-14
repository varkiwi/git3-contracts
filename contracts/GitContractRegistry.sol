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

}