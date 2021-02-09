const deployContract = async (contractName, args) => {
    const contractFactory = await ethers.getContractFactory(contractName);
    let contractInstance;
    if (args !== undefined) {
        contractInstance = await contractFactory.deploy(...args);
    } else {
        contractInstance = await contractFactory.deploy();
    }
    return contractInstance;
}

module.exports = {
    deployContract
}