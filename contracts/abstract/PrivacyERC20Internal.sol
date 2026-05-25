// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {
    IERC20Metadata
} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {
    IERC20Errors
} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {
    SignatureRSV
} from "@oasisprotocol/sapphire-contracts/contracts/EthereumUtils.sol";
import {
    Sapphire
} from "@oasisprotocol/sapphire-contracts/contracts/Sapphire.sol";

import {IdentitySalt} from "./IdentitySalt.sol";
import {PrivacyEIP712} from "./PrivacyEIP712.sol";

/**
 * @title PrivacyERC20Internal
 * @notice Abstract contract encapsulating internal variables and helpers for PrivacyERC20WithUserId
 */
abstract contract PrivacyERC20Internal is IERC20Errors, IdentitySalt, PrivacyEIP712 {
    // Encrypted state variables
    bytes32 internal _globalNonce;
    // The address is not real user address, 
    // it is the address of the user's identity contract 'virtual address'
    mapping(address => bytes) internal _encryptedBalances;
    mapping(address => mapping(address => uint256)) internal _allowances;

    // Underlying ERC20 token for wrap/unwrap
    IERC20Metadata public immutable underlyingToken;

    constructor(
        address underlyingToken_,
        bytes memory pers_
    )
        IdentitySalt(pers_)
        PrivacyEIP712("Privacy ERC20 Token with Virtual Address", "1")
    {
        underlyingToken = IERC20Metadata(underlyingToken_);
        _globalNonce = bytes32(Sapphire.randomBytes(32, ""));
    }

    // =========================================================================================
    // Privacy encryption & decryption
    function _encryptBalance(
        uint256 balance
    ) internal view returns (bytes memory) {
        bytes memory data = abi.encodePacked(balance);
        return Sapphire.encrypt(bytes32(0), _globalNonce, data, "");
    }

    function _decryptBalance(address user) internal view returns (uint256) {
        bytes memory data = _encryptedBalances[user];
        if (data.length == 0) {
            return 0;
        }

        bytes memory decryptedData = Sapphire.decrypt(
            bytes32(0),
            _globalNonce,
            data,
            ""
        );

        return abi.decode(decryptedData, (uint256));
    }

    function _setEncryptedBalance(address virtualAddr, uint256 balance) internal {
        _encryptedBalances[virtualAddr] = _encryptBalance(balance);
    }

    // =========================================================================================

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }

        uint256 fromBalance = _decryptBalance(from);
        if (fromBalance < value) {
            revert ERC20InsufficientBalance(from, fromBalance, value);
        }

        uint256 toBalance = _decryptBalance(to);

        _setEncryptedBalance(from, fromBalance - value);
        _setEncryptedBalance(to, toBalance + value);

        // note: we don't emit the Transfer event for privacy protection
    }

    function _approve(address owner, address spender, uint256 value) internal {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;

    }

    function _checkSpendAllowance(
        address owner,
        address spender,
        uint256 value
    ) internal {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance < type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(
                    spender,
                    currentAllowance,
                    value
                );
            }
            // Update the allowance
            unchecked {
                _approve(owner, spender, currentAllowance - value);
            }
        }
    }

        // Standard transferFrom
    function _transferFrom(
        address from,
        address to,
        address sender,
        uint256 value
    ) internal {
        _checkSpendAllowance(from, sender, value);
        _transfer(from, to, value);
    }

}
