// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./Crowdsale.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title CappedCrowdsale
 * @dev Extension of Crowdsale with a max amount of funds raised
 */
abstract contract CappedCrowdsale is Crowdsale {
  using SafeMath for uint256;

  uint256 private hardCap;
  uint256 private softCap;


  constructor(uint256 _hardCap, uint256 _softCap) {
    require(_softCap > 0);
    require(_hardCap > 0);
    require(_hardCap >= _softCap,"CappedCrowdsale: Invalid softCap");
    hardCap = _hardCap;
    softCap = _softCap;
  }

  // overriding Crowdsale#validPurchase to add extra cap logic
  // @return true if investors can buy at the moment
  function validPurchase() internal view virtual override returns (bool) {
    bool withinCap = totalEthRaised().add(msg.value) <= hardCap;
    return super.validPurchase() && withinCap;
  }

  // overriding Crowdsale#hasEnded to add cap logic
  // @return true if crowdsale event has ended
  function hasEnded() public view virtual override returns (bool) {
    bool capReached = totalEthRaised() >= hardCap;
    return super.hasEnded() || capReached;
  }

}