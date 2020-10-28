pragma solidity ^0.4.24;

import "../interfaces/IPriceProvider.sol";

contract PriceProviderMock is IPriceProvider {
  bytes32 btcPrice;
  bool has;

  constructor(uint256 price) public {
    btcPrice = bytes32(price);
    has = true;
  }

  function peek() external view returns (bytes32, bool) {
    return (btcPrice, has);
  }
} 