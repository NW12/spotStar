// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Listing is Ownable {
    address[] public whiteListAddresses;
    mapping(address => uint256) public whitelistedIndex;
    mapping(address => bool) public whitelistedMap;

    event Whitelisted(address indexed account, bool isWhitelisted);

    function whitelisted(address _address) public view returns (bool) {
        return whitelistedMap[_address];
    }

    function addWhitelist(address _address) public onlyOwner {
        _addWhitelist(_address);
    }

    function _addWhitelist(address _address) internal {
        require(whitelistedMap[_address] != true);
        whitelistedMap[_address] = true;
        whitelistedIndex[_address] = whiteListAddresses.length;
        whiteListAddresses.push(_address);
        emit Whitelisted(_address, true);
    }

    function removeWhitelist(address _address) public onlyOwner {
        require(whitelistedMap[_address] != false);
        uint256 index = whitelistedIndex[_address];
        require(index < whiteListAddresses.length);
        whiteListAddresses[index] = whiteListAddresses[
            whiteListAddresses.length - 1
        ];
        whiteListAddresses.pop();
        whitelistedMap[_address] = false;
        emit Whitelisted(_address, false);
    }
}
