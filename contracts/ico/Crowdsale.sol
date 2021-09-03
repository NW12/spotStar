// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./Listing.sol";
import "hardhat/console.sol";
import "../interface/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract Crowdsale is ReentrancyGuard ,Listing {
    using SafeMath for uint256;

    // The token being sold
    IERC20 public token;
    AggregatorV3Interface internal priceFeed = AggregatorV3Interface(0x8A753747A1Fa494EC906cE90E9f37563A8AF630e);


    // ICO Stages
    // ============
    enum CrowdsaleStage {
        PRIVATESALE,
        PREICO,
        ICO_ROUND_ONE,
        ICO_ROUND_TWO
    }
    CrowdsaleStage public stage = CrowdsaleStage.PRIVATESALE; // By default it's PRIVATE SALE;

    // Starting Dates
    // PRIVATESALE => August 16 00:00 UTC => 1629158399
    // PREICO => September 17 00:00 UTC => 1631836800
    // ICO_ROUND_ONE => October 1 00:00 UTC => 1633046400
    // ICO_ROUND_TWO => November 1 00:00 UTC => 1635724800
    // ===================================================
    mapping(CrowdsaleStage => uint256) public startingTimes;

    // Ending Dates
    // PRIVATESALE => September 17 23:59 UTC  => 1631923199
    // PREICO => September 30 23:59 UTC => 1633046399
    // ICO_ROUND_ONE => November 1 23:59 UTC => 1635811199
    // ICO_ROUND_TWO => December 1 23:59 => 1638403199
    // ===================================================
    mapping(CrowdsaleStage => uint256) public endingTimes;

    // HardCap and SoftCaps
    // =============================
    uint256 public constant MAXIMUM_GOAL = 100000 ether;
    uint256 public constant MINIMUM_GOAL = 5000 ether;
    // ==============================

    // Investors addresses & allocations
    // =============================
    uint256 public investorsProcessed;
    uint256 public investorsTotalAllocated = 0;
    address[] public investorsAllocatedAddresses;
    mapping(address => uint256) public investorsAllocated;

    // Token Distribution
    // =============================
    uint256 public totalSold;
    uint256 public maxTokens = 200000000 ether;
    uint256 public totalTokensForSale = 140000000 ether;

    mapping(CrowdsaleStage => uint256) public stageTokens;
    mapping(CrowdsaleStage => uint256) public soldTokens;
    mapping(CrowdsaleStage => uint256) public weiRaised;
    mapping(CrowdsaleStage => uint256) public rates;
    // ==============================

    // minimum and maximum amount of ether a user can send
    uint256 public maxEtherAmount = 10000 ether;
    uint256 public minEtherAmount = 0.05 ether;

    // address where funds are collected
    address payable public wallet;

    // Events
    event EthTransferred(string text);
    event EthRefunded(string text);
    event StageTokenInfo(uint256 indexed stage, uint256 tokens);
    event Investors(address indexed investor, uint256 tokens);
    event InvestorsProcessed(address indexed investor, uint256 tokens);
    event EthDeposit(uint256 indexed stage, uint256 amount, uint256 timestamp);
    event StageInfo(uint256 indexed stage, uint256 tokens, uint256 rate, uint256 startingTime, uint256 endingTime);

    modifier checkDeposit(uint256 value) {
        require(value >= minEtherAmount, "Crowdsale: Minimum deposit is 0.05");
        require(value <= maxEtherAmount, "Crowdsale: Maximum deposit is 10000");
        _;
    }
    modifier checkPrivateSaleTime() {
        if ((stage == CrowdsaleStage.PRIVATESALE) && (block.timestamp < startingTimes[CrowdsaleStage.PRIVATESALE]))
            revert("Crowdsale: PRIVATE_SALE_NOT_STARTED");
        if ((stage == CrowdsaleStage.PRIVATESALE) && (block.timestamp > endingTimes[CrowdsaleStage.PRIVATESALE]))
            revert("Crowdsale: PRIVATE_SALE_ENDED");
        _;
    }
    modifier checkTimeLines() {
        if (
            (stage == CrowdsaleStage.PRIVATESALE) &&
            (block.timestamp >= startingTimes[CrowdsaleStage.PRIVATESALE]) &&
            (block.timestamp <= endingTimes[CrowdsaleStage.PRIVATESALE])
        ) revert("Crowdsale: PRIVATE_SALE_IS_RUNNING");
        if ((stage == CrowdsaleStage.PREICO) && (block.timestamp < startingTimes[CrowdsaleStage.PREICO]))
            revert("Crowdsale: PREICO_NOT_STARTED");
        if ((stage == CrowdsaleStage.PREICO) && (block.timestamp > endingTimes[CrowdsaleStage.PREICO]))
            revert("Crowdsale: PREICO_ENDED");
        if ((stage == CrowdsaleStage.ICO_ROUND_ONE) && (block.timestamp < startingTimes[CrowdsaleStage.ICO_ROUND_ONE]))
            revert("Crowdsale: ICO_ROUND_ONE_NOT_STARTED");
        if ((stage == CrowdsaleStage.ICO_ROUND_ONE) && (block.timestamp > endingTimes[CrowdsaleStage.ICO_ROUND_ONE]))
            revert("Crowdsale: ICO_ROUND_ONE_ENDED");
        if ((stage == CrowdsaleStage.ICO_ROUND_TWO) && (block.timestamp < startingTimes[CrowdsaleStage.ICO_ROUND_TWO]))
            revert("Crowdsale: ICO_ROUND_TWO_NOT_STARTED");
        if ((stage == CrowdsaleStage.ICO_ROUND_TWO) && (block.timestamp > endingTimes[CrowdsaleStage.ICO_ROUND_TWO]))
            revert("Crowdsale: ICO_ROUND_TWO_ENDED");
        _;
    }

    modifier checkCaps(uint256 weiAmount) {
        uint256 tokens = weiAmount.mul(rates[stage]).div(10**18);
        if ((stage == CrowdsaleStage.PRIVATESALE) && (soldTokens[stage].add(tokens) > stageTokens[stage]))
            revert("PRIVATE_SALE_TOKENS_SOLD_OUT");
        if ((stage == CrowdsaleStage.PREICO) && (soldTokens[stage].add(tokens) > stageTokens[stage]))
            revert("PRE_ICO_TOKENS_SOLD_OUT");
        if ((stage == CrowdsaleStage.ICO_ROUND_ONE) && (soldTokens[stage].add(tokens) > stageTokens[stage]))
            revert("ICO_ROUND_ONE_TOKENS_SOLD_OUT");
        if ((stage == CrowdsaleStage.ICO_ROUND_TWO) && (soldTokens[stage].add(tokens) > stageTokens[stage]))
            revert("ICO_ROUND_TWO_TOKENS_SOLD_OUT");
        _;
    }

    function isValidTimePeriod() internal view returns (bool) {
        return ((block.timestamp >= startingTimes[CrowdsaleStage.PRIVATESALE] &&
            block.timestamp <= endingTimes[CrowdsaleStage.PRIVATESALE]) ||
            (block.timestamp >= startingTimes[CrowdsaleStage.PREICO] &&
                block.timestamp <= endingTimes[CrowdsaleStage.PREICO]) ||
            (block.timestamp >= startingTimes[CrowdsaleStage.ICO_ROUND_ONE] &&
                block.timestamp <= endingTimes[CrowdsaleStage.ICO_ROUND_ONE]) ||
            (block.timestamp >= startingTimes[CrowdsaleStage.ICO_ROUND_TWO] &&
                block.timestamp <= endingTimes[CrowdsaleStage.ICO_ROUND_TWO]));
    }

    /**
     * event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    constructor(address _token, address _wallet) {
        require(_wallet != address(0));

        token = IERC20(_token);
        wallet = payable(_wallet);
        initialize();
    }

    // fallback function can be used to buy tokens
    fallback() external payable {
        buyTokens(msg.sender);
    }

    receive() external payable virtual {
        buyTokens(msg.sender);
    }

    modifier isWhitelisted(address account) {
        require(whitelisted(account),"NOT_WHITELISTED");
        _;
    }
    // low level token purchase function
    function buyTokens(address beneficiary)
        public
        payable
        nonReentrant
        isWhitelisted(msg.sender)
        isWhitelisted(beneficiary)
        checkTimeLines
        checkDeposit(msg.value)
        checkCaps(msg.value)
    {
        require(beneficiary != address(0), "ZERO_ADDRESS");
        require(validPurchase(), "INVALID-PURCHASE");
        uint256 weiAmount = msg.value;
        uint256 tokens = getTokens(rates[stage],msg.value);
        weiRaised[stage] = weiRaised[stage].add(weiAmount);
        soldTokens[stage] = soldTokens[stage].add(tokens);
        token.transfer(beneficiary, tokens);
        emit TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
        forwardFunds();
    }

    function initialize() internal {
        stageTokens[CrowdsaleStage.PREICO] = 21000000 ether;
        stageTokens[CrowdsaleStage.PRIVATESALE] = 35000000 ether;
        stageTokens[CrowdsaleStage.ICO_ROUND_ONE] = 42000000 ether;
        stageTokens[CrowdsaleStage.ICO_ROUND_TWO] = 42000000 ether;

        startingTimes[CrowdsaleStage.PREICO] = 1632614400;
        startingTimes[CrowdsaleStage.PRIVATESALE] = 1630454400;
        startingTimes[CrowdsaleStage.ICO_ROUND_ONE] = 1633737600;
        startingTimes[CrowdsaleStage.ICO_ROUND_TWO] = 1636502400;

        endingTimes[CrowdsaleStage.PREICO] = 1633737599;
        endingTimes[CrowdsaleStage.PRIVATESALE] = 1632614399;
        endingTimes[CrowdsaleStage.ICO_ROUND_ONE] = 1636502399;
        endingTimes[CrowdsaleStage.ICO_ROUND_TWO] = 1639180799;

        rates[CrowdsaleStage.PREICO] = 2000 ether;
        rates[CrowdsaleStage.PRIVATESALE] = 1000 ether;
        rates[CrowdsaleStage.ICO_ROUND_ONE] = 3000 ether;
        rates[CrowdsaleStage.ICO_ROUND_TWO] = 4000 ether;

        emit StageInfo(
            uint256(CrowdsaleStage.PRIVATESALE),
            stageTokens[CrowdsaleStage.PRIVATESALE],
            rates[CrowdsaleStage.PRIVATESALE],
            startingTimes[CrowdsaleStage.PRIVATESALE],
            endingTimes[CrowdsaleStage.PRIVATESALE]
        );
        emit StageInfo(
            uint256(CrowdsaleStage.PREICO),
            stageTokens[CrowdsaleStage.PREICO],
            rates[CrowdsaleStage.PREICO],
            startingTimes[CrowdsaleStage.PREICO],
            endingTimes[CrowdsaleStage.PREICO]
        );
        emit StageInfo(
            uint256(CrowdsaleStage.ICO_ROUND_ONE),
            stageTokens[CrowdsaleStage.ICO_ROUND_ONE],
            rates[CrowdsaleStage.ICO_ROUND_ONE],
            startingTimes[CrowdsaleStage.ICO_ROUND_ONE],
            endingTimes[CrowdsaleStage.ICO_ROUND_ONE]
        );
        emit StageInfo(
            uint256(CrowdsaleStage.ICO_ROUND_TWO),
            stageTokens[CrowdsaleStage.ICO_ROUND_TWO],
            rates[CrowdsaleStage.ICO_ROUND_TWO],
            startingTimes[CrowdsaleStage.ICO_ROUND_TWO],
            endingTimes[CrowdsaleStage.ICO_ROUND_TWO]
        );
    }

    // send ether to the fund collection wallet
    // override to create custom fund forwarding mechanisms
    function forwardFunds() internal virtual {}

    // @return true if the transaction can buy tokens
    function validPurchase() internal view virtual returns (bool) {
        bool withinPeriod = isValidTimePeriod();
        bool nonZeroPurchase = msg.value != 0;
        return withinPeriod && nonZeroPurchase;
    }

    // @return true if crowdsale event has ended
    function hasEnded() public view virtual returns (bool) {
        return block.timestamp > endingTimes[CrowdsaleStage.ICO_ROUND_TWO];
    }

    function totalEthRaised() public view returns (uint256) {
        return
            weiRaised[CrowdsaleStage.PRIVATESALE].add(
                weiRaised[CrowdsaleStage.PREICO].add(weiRaised[CrowdsaleStage.ICO_ROUND_ONE]).add(
                    weiRaised[CrowdsaleStage.ICO_ROUND_TWO]
                )
            );
    }

    function totalTokensSold() public view returns (uint256) {
        return
            soldTokens[CrowdsaleStage.PRIVATESALE].add(
                soldTokens[CrowdsaleStage.PREICO].add(soldTokens[CrowdsaleStage.ICO_ROUND_ONE]).add(
                    soldTokens[CrowdsaleStage.ICO_ROUND_TWO]
                )
            );
    }

    function getTokens(uint256 rate , uint256 givenAmount) internal view returns (uint256) {
        (
            ,int price,,,
            
        ) = priceFeed.latestRoundData();
        
        uint256 ether_to_usd_Rate = uint256(price) * givenAmount;
        uint256 tokens = ether_to_usd_Rate / rate;
        return tokens;
    }
}
