// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {IWROSE} from "../interfaces/IWROSE.sol";
import {PrivacyERC20} from "./PrivacyERC20.sol";
contract PrivacyWROSE is
    PrivacyERC20,
    IWROSE
{
    error TransferFailed();

    bool private _withdrawing;

    constructor(
        address underlyingToken_
    )
        PrivacyERC20(underlyingToken_)
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

        uint256 currentBalance = _decryptBalance(msg.sender);
        if (currentBalance < amount) revert InsufficientBalance();

        _withdrawing = true;
        _setEncryptedBalance(msg.sender, currentBalance - amount);
        // withdraw underlying ERC20 token
        IWROSE(address(underlyingToken)).withdraw(amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        _withdrawing = false;
        emit Transfer(msg.sender, address(0), amount);
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

        uint256 currentBalance = _decryptBalance(msg.sender);
        _setEncryptedBalance(msg.sender, currentBalance + msg.value);

        emit Transfer(address(0), msg.sender, msg.value);
    }
}
