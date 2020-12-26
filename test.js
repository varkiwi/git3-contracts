const hre = require("hardhat");

hre.artifacts.readArtifact("Greeter")
    .then((artifacts) => {
        const selectors = artifacts.abi.reduce((acc, val) => {
            
        }, []);

        // onst selectors = contract.abi.reduce((acc, val) => {
        //     if (val.type === 'function') {
        //       acc.push(val.signature)
        //       return acc
        //     } else {
        //       return acc
        //     }
        //   }, [])
    });