// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "./GitRepository.sol";
import "./interfaces/IDiamondCut.sol";

contract GitRepositoryDeployer {
    /**
     * deployCOntract function takes two arguments and uses those to deploy a new GitRepository contract
     *
     * @param _diamondCut (IDiamondCut.FacetCut[]) - Facets for the Gitrepository to use
     * @param _args (GitRepository.RepositoryArgs) - Repository information
     *
     * @return newGitRepo (GitRepository) - GitRepository object
     */
    function deployContract(
        IDiamondCut.FacetCut[] memory _diamondCut,
        GitRepository.RepositoryArgs memory _args
    ) public returns (GitRepository newGitRepo) {
        newGitRepo = new GitRepository(
            _diamondCut, 
            _args
        );
    }
}