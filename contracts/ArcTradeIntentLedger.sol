// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ArcTradeIntentLedger
/// @notice TESTNET / SIMULATION ONLY
/// @dev Stores user-confirmed trade intents for Arc Testnet workflows.
contract ArcTradeIntentLedger {
    /// @notice TESTNET / SIMULATION ONLY
    /// @dev This contract does not custody funds and does not auto-execute swaps.
    event TradeIntentCreated(
        address indexed user,
        string market,
        string side,
        uint256 notionalUsdc6,
        uint256 confidence,
        string reason
    );

    struct TradeIntent {
        address user;
        string market;
        string side;
        uint256 notionalUsdc6;
        uint256 confidence;
        string reason;
        uint256 createdAt;
    }

    TradeIntent[] private intents;

    function createTradeIntent(
        string calldata market,
        string calldata side,
        uint256 notionalUsdc6,
        uint256 confidence,
        string calldata reason
    ) external {
        intents.push(
            TradeIntent({
                user: msg.sender,
                market: market,
                side: side,
                notionalUsdc6: notionalUsdc6,
                confidence: confidence,
                reason: reason,
                createdAt: block.timestamp
            })
        );

        emit TradeIntentCreated(msg.sender, market, side, notionalUsdc6, confidence, reason);
    }

    function getIntentCount() external view returns (uint256) {
        return intents.length;
    }

    function getIntent(uint256 index) external view returns (TradeIntent memory) {
        return intents[index];
    }
}
