// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {
    IERC20Metadata
} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {
    IERC20Errors
} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
// import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {
    SignatureRSV
} from "@oasisprotocol/sapphire-contracts/contracts/EthereumUtils.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {PrivacyERC20Internal} from "./abstract/PrivacyERC20Internal.sol";
import {PrivacyERC20Errors} from "./interfaces/PrivacyERC20Errors.sol";
/**
 * @title PrivacyERC20
 * @notice Privacy ERC20 Token implementing balance mapping via random userId
 */
contract PrivacyERC20 is
    IERC20Metadata,
    IERC20Errors,
    PrivacyERC20Errors,
    ReentrancyGuard,
    PrivacyERC20Internal
{
    error NotContractAddress();

    // Constructor
    constructor(
        address underlyingToken_,
        bytes memory pers_
    )
        PrivacyERC20Internal(underlyingToken_, pers_)
    {}

    // ERC20 metadata overrides
    function name() public view virtual returns (string memory) {
        return string(abi.encodePacked("Privacy ", underlyingToken.name(), " with UserId"));
    }

    function symbol() public view virtual returns (string memory) {
        return string(abi.encodePacked(underlyingToken.symbol(), ".Privacy"));
    }

    function decimals() public view virtual returns (uint8) {
        return underlyingToken.decimals();
    }

    function totalSupply() public view virtual returns (uint256) {
        return underlyingToken.balanceOf(address(this));
    }
    

    // Balance query
    function balanceOf(address account) public view virtual returns (uint256) {
        // Contract addresses and caller's EOA can be queried publicly.
        // If it's a contract or msg.sender, we resolve it as a real address.
        // Otherwise, we treat the account parameter directly as a virtual address.
        if (account.code.length > 0 || account == msg.sender) {
            address virtualAddr = _getVirtualAddress(account);
            return _decryptBalance(virtualAddr);
        }
        return _decryptBalance(account);
    }

    function _checkContracts(address addr) internal view returns(address) {
        if (addr.code.length > 0 ) {
            return _getVirtualAddress(addr);
        }
        return addr;
    }

    // Allowance query
    function allowance(
        address owner,
        address spender
    ) public view virtual returns (uint256) {

        address ownerVirtual = _checkContracts(owner);
        address spenderVirtual = _checkContracts(spender);

        return _allowances[ownerVirtual][spenderVirtual];
    }

    // Standard transfer
    function transfer(address to, uint256 value) public virtual returns (bool) {
        address fromVirtual = _getVirtualAddress(msg.sender);

        address toVirtual = _checkContracts(to);
        _transfer(fromVirtual, toVirtual, value);
        return true;
    }

    // Standard approve
    function approve(
        address spender,
        uint256 value
    ) public virtual returns (bool) {
        address ownerVirtual = _getVirtualAddress(msg.sender);
        address spenderVirtual = _checkContracts(spender);
        _approve(ownerVirtual, spenderVirtual, value);
        return true;
    }

    // Standard transferFrom
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public virtual returns (bool) {
        address senderVirtual = _getVirtualAddress(msg.sender);
        address fromVirtual = _checkContracts(from);
        address toVirtual = _checkContracts(to);

        _transferFrom(fromVirtual, toVirtual, senderVirtual, value);
        return true;
    }

    // ================================================================================================
    // Permit authorization functions
    function balanceOfWithPermit(
        EIP712Permit memory permit
    ) external view returns (uint256) {
        if (!_verifyPermit(permit, PermitLabel.VIEW)) revert EIPError();

        address ownerVirtual = _getVirtualAddress(permit.owner);
        return _decryptBalance(ownerVirtual);
    }

    function allowanceWithPermit(
        EIP712Permit memory permit
    ) external view returns (uint256) {
        if (!_verifyPermit(permit, PermitLabel.VIEW)) revert EIPError();
        
        address ownerVirtual = _getVirtualAddress(permit.owner);
        address spenderVirtual = _checkContracts(permit.spender);
        return _allowances[ownerVirtual][spenderVirtual];
    }

    // Note: in transferWithPermit, permit.owner is a real address and permit.spender acts as a virtual address (destination)
    function transferWithPermit(
        EIP712Permit memory permit
    ) external nonReentrant uniqueSignature(permit.signature) {
        if (!_verifyPermit(permit, PermitLabel.TRANSFER)) revert EIPError();

        address fromVirtual = _getVirtualAddress(permit.owner);
        address toVirtual = _checkContracts(permit.spender);
        _transfer(fromVirtual, toVirtual, permit.amount);
    }

    // Note: in approveWithPermit, permit.owner is a real address and permit.spender acts as a virtual address (spender)
    function approveWithPermit(
        EIP712Permit memory permit
    ) external nonReentrant uniqueSignature(permit.signature) {
        if (!_verifyPermit(permit, PermitLabel.APPROVE)) revert EIPError();

        address ownerVirtual = _getVirtualAddress(permit.owner);
        address spenderVirtual = _checkContracts(permit.spender);
        _approve(ownerVirtual, spenderVirtual, permit.amount);
    }

    // ===============================================================================================
    // Wrap & Unwrap
    function wrap(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        underlyingToken.transferFrom(msg.sender, address(this), amount);

        address senderVirtual = _getVirtualAddress(msg.sender);
        uint256 currentBalance = _decryptBalance(senderVirtual);
        _setEncryptedBalance(senderVirtual, currentBalance + amount);
    }

    // Note: unwrap requires msg.sender to be a real address, debiting from their real user KDF-derived identity balance
    function unwrap(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        address senderVirtual = _getVirtualAddress(msg.sender);
        uint256 currentBalance = _decryptBalance(senderVirtual);
        if (currentBalance < amount) revert InsufficientBalance();

        _setEncryptedBalance(senderVirtual, currentBalance - amount);
        underlyingToken.transfer(msg.sender, amount);
    }

    // ===============================================================================================

    // Replay protection signature checking
    function isSignatureUsed(
        SignatureRSV memory signature
    ) external view returns (bool) {
        return _isSignatureUsed(signature);
    }

    // New interface to query a user's virtual address via EIP-712 signature (for EOA)
    function getMyVirtualAddress(
        EIP712Permit memory permit
    ) external view returns (address) {
        if (!_verifyPermit(permit, PermitLabel.VIRTUAL_ADDRESS)) revert EIPError();
        return _getVirtualAddress(permit.owner);
    }
}
