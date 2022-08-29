// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../libraries/LibGitFactory.sol";

contract GitFactoryTips {
    function collectTips() public {
        LibGitFactory.FactoryInformation storage fi = LibGitFactory.factoryInformation();
        require(msg.sender == address(fi.owner), 'Ownable: caller is not the owner');
        uint tips = fi.tips;
        fi.tips = 0;
        payable(fi.owner).transfer(tips);
    }

    /**
     * The getTips function is used to get the current number of tips/donations
     * the repository has received.
     *
     * @return {uint} The number of donations in wei
     */
    function getTips() public view returns (uint) {
        LibGitFactory.FactoryInformation storage fi = LibGitFactory.factoryInformation();
        return fi.tips;
    }
}