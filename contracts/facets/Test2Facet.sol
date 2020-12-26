// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

library LibA {

  // This struct contains state variables we care about.
  struct DiamondStorage {
    uint dataA;
    uint dataB;
  }

  // Returns the struct from a specified position in contract storage
  // ds is short for DiamondStorage
  function diamondStorage() internal pure returns(DiamondStorage storage ds) {
    // Specifies a random position from a hash of a string
    bytes32 storagePosition = keccak256("diamond.storage.LibA");
    // Set the position of our struct in contract storage
    assembly {
        ds.slot := storagePosition
    }
  }
}

contract Test2Facet {
    event TestEvent(address something);

    function test2Func1() external {}

    function test2Func2() external {}

    function test2Func3() external {}

    function test2Func4() external {}

    function test2Func5() external {}

    function test2Func6() external {}

    function test2Func7() external {}

    function test2Func8() external {}

    function test2Func9() external {}

    function test2Func10() external {}

    function test2Func11() external {}

    function test2Func12() external {}

    function test2Func13() external {}

    function test2Func14() external {}

    function test2Func15() external {}

    function test2Func16() external {}

    function test2Func17() external {}

    function test2Func18() external {}

    function test2Func19() external {}

    function test2Func20() external {}

    function xtreme3A(uint x) external {
        LibA.DiamondStorage storage ds = LibA.diamondStorage();
        ds.dataA = x;
    }

    function xtreme4A() external view returns (uint) {
        LibA.DiamondStorage storage ds = LibA.diamondStorage();
        return ds.dataA;
    }

    function xtreme3B(uint x) external {
        LibA.DiamondStorage storage ds = LibA.diamondStorage();
        ds.dataB = x;
    }

    function xtreme4B() external view returns (uint) {
        LibA.DiamondStorage storage ds = LibA.diamondStorage();
        return ds.dataB;
    }

    function supportsInterface(bytes4 _interfaceID) external view returns (bool) {}
}