// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../GitFactory.sol";
import "../libraries/LibGitRepository.sol";

contract GitTips {
    bytes32 constant GIT_ISSUES_STORAGE_POSITION = keccak256("diamond.standard.git.tips");

    function collectTips() public {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();
        require(msg.sender == address(ri.contractOwner), 'You are not allowd to perform this action');
        uint donation = ri.donations;
        ri.donations = 0;
        payable(ri.contractOwner).transfer(donation);
    }

    function getTips() public view returns (uint) {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();
        return ri.donations;
    }
}