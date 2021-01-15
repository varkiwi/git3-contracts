const getDiamondCuts = async (gitFactory) => {
    let numberOfEntries = 0;
    let noError = true;
    let entries = []
    while (noError) {
        try {
            entries.push(await gitFactory.diamondCuts(numberOfEntries));
            numberOfEntries += 1;
        } catch (e) {
          noError = false;
        }
    }
    return [numberOfEntries, entries];
}

module.exports = {
    getDiamondCuts
}