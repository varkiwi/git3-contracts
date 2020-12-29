// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./GitRepository.sol";
import "./interfaces/IDiamondCut.sol";

contract Deployer {
    function deployContract(
        IDiamondCut.FacetCut[] memory _diamondCut,
        GitRepository.DiamondArgs memory _args
    ) public returns (GitRepository newGitRepo) {
        newGitRepo = new GitRepository(
            _diamondCut, 
            _args
        );
    }
}