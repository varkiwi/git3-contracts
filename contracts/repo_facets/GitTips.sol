// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../GitFactory.sol";
import "../libraries/LibGitRepository.sol";

contract GitTips {
    bytes32 constant GIT_ISSUES_STORAGE_POSITION = keccak256("diamond.standard.git.tips");

    /**
     * The collect tips function is used on order to send the tips to the owner of the
     * repository.
     */
    function collectTips() public {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();
        require(msg.sender == address(ri.contractOwner), 'You are not allowd to perform this action');
        uint donation = ri.donations;
        ri.donations = 0;
        payable(ri.contractOwner).transfer(donation);
    }

    /**
     * The getTips function is used to get the current number of tips/donations
     * the repository has received.
     *
     * @return {uint} The number of donations in wei
     */
    function getTips() public view returns (uint) {
        LibGitRepository.RepositoryInformation storage ri = LibGitRepository.repositoryInformation();
        return ri.donations;
    }
}