// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./ico/CappedCrowdsale.sol";
import "./ico/RefundableCrowdsale.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title SpotStart ICO
 * @author salmancodez@gmail.com
 * @dev Crowdsale is a base contract for managing a token crowdsale
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them Ritz tokens based
 * on a Ritz token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive
 */
contract SpotStarIco is CappedCrowdsale, RefundableCrowdsale {
    using SafeMath for uint256;

    // Constructor
    // ============
    constructor(address _token, address _wallet)
        CappedCrowdsale(MAXIMUM_GOAL, MINIMUM_GOAL)
        FinalizableCrowdsale()
        RefundableCrowdsale(MINIMUM_GOAL)
        Crowdsale(_token, _wallet)
    {}

    // =============

    // Crowdsale Stage Management
    // =========================================================

    // Change Crowdsale Stage. Available Options: PrivateSale, PreICO, ICO_ROUND_ONE,ICO_ROUND_TWO
    function setCrowdsaleStage(uint256 value) public onlyOwner {
        if (uint256(CrowdsaleStage.PRIVATESALE) == value) {
            stage = CrowdsaleStage.PRIVATESALE;
        }
        if (uint256(CrowdsaleStage.PREICO) == value) {
            stage = CrowdsaleStage.PREICO;
            stageTokens[stage] = stageTokens[stage].add(
                stageTokens[CrowdsaleStage.PRIVATESALE].sub(soldTokens[CrowdsaleStage.PRIVATESALE])
            );
        }
        if (uint256(CrowdsaleStage.ICO_ROUND_ONE) == value) {
            stage = CrowdsaleStage.ICO_ROUND_ONE;
            stageTokens[stage] = stageTokens[stage].add(
                stageTokens[CrowdsaleStage.PREICO].sub(soldTokens[CrowdsaleStage.PREICO])
            );
        }
        if (uint256(CrowdsaleStage.ICO_ROUND_TWO) == value) {
            stage = CrowdsaleStage.ICO_ROUND_TWO;
            stageTokens[stage] = stageTokens[stage].add(
                stageTokens[CrowdsaleStage.ICO_ROUND_ONE].sub(soldTokens[CrowdsaleStage.ICO_ROUND_ONE])
            );
        }
        emit StageTokenInfo(uint256(stage), stageTokens[stage]);
    }

    // ================ Stage Management Over =====================

    // Token Purchase
    // =========================
    receive() external payable override {
        buyTokens(msg.sender);
    }

    function forwardFunds() internal override(RefundableCrowdsale, Crowdsale) {
        RefundableCrowdsale.forwardFunds();
        emit EthDeposit(uint256(stage), msg.value, block.timestamp);
    }

    // Finish: Mint Extra Tokens as needed before finalizing the Crowdsale.
    // ====================================================================

    function finish() public onlyOwner {
        require(!isFinalized, "FINISHED");
        require(totalTokensSold() < maxTokens);
        uint256 unsoldTokens = totalTokensForSale.sub(totalTokensSold());
        if (unsoldTokens > 0) {
            token.transfer(owner(), unsoldTokens);
        }
        finalize();
    }

    // ===============================

    function validPurchase() internal view override(CappedCrowdsale, Crowdsale) returns (bool isValidPurchase) {
        return CappedCrowdsale.validPurchase();
    }

    function hasEnded() public view virtual override(CappedCrowdsale, Crowdsale) returns (bool) {
        return CappedCrowdsale.hasEnded();
    }

    function addInvestorAllocation(address[] calldata destination, uint256[] calldata value)
        external
        onlyOwner
        checkPrivateSaleTime
    {
        require(destination.length == value.length);
        uint256 len = destination.length;
        uint256 sum = 0;

        for (uint256 i = 0; i < len; ++i) {
            require(destination[i] != address(0));
            sum = sum.add(value[i]);
        }
        soldTokens[CrowdsaleStage.PRIVATESALE] = soldTokens[CrowdsaleStage.PRIVATESALE].add(sum);
        require(
            soldTokens[CrowdsaleStage.PRIVATESALE] < stageTokens[CrowdsaleStage.PRIVATESALE],
            "PRIVATE_SALE_TOKENS_SOLD_OUT"
        );
        for (uint256 j = 0; j < len; ++j) {
            if (investorsAllocated[destination[j]] == 0) investorsAllocatedAddresses.push(destination[j]);
            investorsAllocated[destination[j]] = investorsAllocated[destination[j]].add(value[j]);
            emit Investors(destination[j], investorsAllocated[destination[j]]);
        }
    }

    /**
     * @dev Functions to distribute tokens to the pre-allocated addresses
     * @dev Every address is processed only once.
     * @dev Privileged users or owner can call the functions
     * @param count count of addresses to process.
     */

    function distributeToPrivateInvestors(uint256 count) external onlyOwner {
        require(hasEnded(), "NOT_ENDED");

        uint256 addressesLeft = investorsAllocatedAddresses.length.sub(investorsProcessed);
        uint256 top = investorsProcessed.add(count);

        if (count > addressesLeft) top = investorsProcessed.add(addressesLeft);

        for (uint256 i = investorsProcessed; i < top; ++i) {
            token.transfer(investorsAllocatedAddresses[i], investorsAllocated[investorsAllocatedAddresses[i]]);
            ++investorsProcessed;
            emit InvestorsProcessed(investorsAllocatedAddresses[i], investorsAllocated[investorsAllocatedAddresses[i]]);
        }
    }
}
