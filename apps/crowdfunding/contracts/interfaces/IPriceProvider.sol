pragma solidity ^0.4.24;

interface IPriceProvider {
  function peek() external view returns (bytes32, bool);
}