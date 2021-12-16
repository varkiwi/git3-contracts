We have a GitContractRegistry which stores function signatures and a contract
address which has the function.
The registry contract is used by the Repository contracts to lookup the address of the contract to be executed.

In order to update the address of a contract, we have to call the `addContractAddress` function of the registry and provide the signatures and the new address of a newly deployed contract.