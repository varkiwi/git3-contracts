// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./GitRepository.sol";

contract GitRepositoryDeployer {
    /**
     * deployCOntract function takes two arguments and uses those to deploy a new GitRepository contract
     *
     * @param _args (GitRepository.RepositoryArgs) - Repository information
     *
     * @return newGitRepo (GitRepository) - GitRepository object
     */
    function deployContract(
        GitRepository.RepositoryArgs memory _args
    ) public returns (GitRepository newGitRepo) {
        newGitRepo = new GitRepository(
            _args
        );
    }
}