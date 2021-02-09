const web3Abi = require("web3-eth-abi");

const getSelectors = (contractFunctions, output=false) => {
    selectors = [];
    for (func in contractFunctions) {
        // we have to add the c_0x part for the solidity-coverage plugin, since it instruments the code and adds a function
        // starting with c_0x and random hex values
        if (func.includes('(') && !func.includes('c_0x')) {
            if (output) {
                console.log('func', func);
            }
            selectors.push(web3Abi.encodeFunctionSignature(func));
        }
    };
    return selectors;
}

module.exports = {
    getSelectors
}