// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {PrivacyERC20} from "./PrivacyERC20.sol";
import {IWROSE} from "./interfaces/IWROSE.sol";

/**
 * @title PrivacyWROSE
 * @notice Privacy WROSE Token implementing native ROSE deposit and withdraw
 */
contract PrivacyWROSE is PrivacyERC20 {

    error TransferFailed();
    // Prevent receive function interference when withdrawing
    bool private _withdrawing;

    constructor(
        address underlyingToken_,
        bytes memory pers_
    )
        PrivacyERC20(underlyingToken_, pers_)
    {}

    /**
     * @dev deposit native ROSE token, first convert to WROSE, then get the same amount of privacy token
     */
    function deposit() external payable nonReentrant {
        _deposit();
    }

    /**
     * @dev withdraw native ROSE token, first unwrap from WROSE, then transfer to user
     * @param amount the amount of ROSE token to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        address senderVirtual = _getVirtualAddress(msg.sender);
        uint256 currentBalance = _decryptBalance(senderVirtual);
        if (currentBalance < amount) revert InsufficientBalance();

        _withdrawing = true;
        _setEncryptedBalance(senderVirtual, currentBalance - amount);
        
        // withdraw underlying WROSE token
        IWROSE(address(underlyingToken)).withdraw(amount);

        // transfer native ROSE to user's real address
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        _withdrawing = false;
    }

    /**
     * @dev receive function for native ROSE token
     */
    receive() external payable {
        // if withdrawing, don't trigger deposit logic
        if (!_withdrawing) {
            _deposit();
        }
    }

    /**
     * @dev internal deposit function: first convert native ROSE to WROSE, then increase privacy token balance
     */
    function _deposit() internal {
        if (msg.value == 0) revert ZeroAmount();

        // convert native ROSE to WROSE token
        IWROSE(address(underlyingToken)).deposit{value: msg.value}();

        address senderVirtual = _getVirtualAddress(msg.sender);
        uint256 currentBalance = _decryptBalance(senderVirtual);
        _setEncryptedBalance(senderVirtual, currentBalance + msg.value);
    }
}
