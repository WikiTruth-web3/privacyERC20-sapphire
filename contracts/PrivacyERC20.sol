// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {
    IERC20Metadata
} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {
    IERC20Errors
} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {
    SignatureRSV
} from "@oasisprotocol/sapphire-contracts/contracts/EthereumUtils.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {PrivacyERC20Internal} from "./abstract/PrivacyERC20Internal.sol";

/**
 * @title PrivacyERC20
 * @notice Privacy ERC20 Token implementing balance mapping via random userId
 */
contract PrivacyERC20With is
    Context,
    IERC20Metadata,
    IERC20Errors,
    ReentrancyGuard,
    PrivacyERC20Internal
{
    error NotContractAddress();

    // Modifiers
    modifier uniqueSignature(SignatureRSV memory signature) {
        _checkSignatureUsed(signature);
        _;
        _usedSignatures[_getHash(signature)] = true;
    }

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
        return string(abi.encodePacked(underlyingToken.symbol(), ".P"));
    }

    function decimals() public view virtual returns (uint8) {
        return underlyingToken.decimals();
    }

    function totalSupply() public view virtual returns (uint256) {
        return underlyingToken.balanceOf(address(this));
    }

    // Balance query
    function balanceOf(address account) public view virtual returns (uint256) {
        // Contract addresses can be queried publicly, EOA accounts must query their own balance
        if (account.code.length > 0 || account == _msgSender()) {
            bytes32 userId = _getUserId(account);
            return _decryptBalance(userId);
        }
        return 0;
    }

    // Allowance query
    function allowance(
        address owner,
        address spender
    ) public view virtual returns (uint256) {
        // Only allow owner or spender to view
        if (owner == _msgSender() || spender == _msgSender()) {
            bytes32 ownerId = _getUserId(owner);
            bytes32 spenderId = _getUserId(spender);
            return _allowances[ownerId][spenderId];
        }
        return 0;
    }

    // Standard transfer
    function transfer(address to, uint256 value) public virtual returns (bool) {
        _transfer(_msgSender(), to, value);
        return true;
    }

    // Standard approve
    function approve(
        address spender,
        uint256 value
    ) public virtual returns (bool) {
        _approve(_msgSender(), spender, value);
        return true;
    }

    // Standard transferFrom
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public virtual returns (bool) {
        _spendAllowance(from, _msgSender(), value);
        _transfer(from, to, value);
        return true;
    }

    // ================================================================================================
    // Permit authorization functions
    function balanceOfWithPermit(
        EIP712Permit memory permit
    ) external view returns (uint256) {
        if (!_verifyPermit(permit, PermitLabel.VIEW)) revert EIPError();

        bytes32 ownerId = _getUserId(permit.owner);
        return _decryptBalance(ownerId);
    }

    function allowanceWithPermit(
        EIP712Permit memory permit
    ) external view returns (uint256) {
        if (!_verifyPermit(permit, PermitLabel.VIEW)) revert EIPError();
        
        bytes32 ownerId = _getUserId(permit.owner);
        bytes32 spenderId = _getUserId(permit.spender);
        return _allowances[ownerId][spenderId];
    }

    function transferWithPermit(
        EIP712Permit memory permit
    ) external nonReentrant uniqueSignature(permit.signature) {
        if (!_verifyPermit(permit, PermitLabel.TRANSFER)) revert EIPError();

        _transfer(permit.owner, permit.spender, permit.amount);
    }

    function approveWithPermit(
        EIP712Permit memory permit
    ) external nonReentrant uniqueSignature(permit.signature) {
        if (!_verifyPermit(permit, PermitLabel.APPROVE)) revert EIPError();

        _approve(permit.owner, permit.spender, permit.amount);
    }

    // ===============================================================================================
    // Wrap & Unwrap
    function wrap(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        underlyingToken.transferFrom(msg.sender, address(this), amount);

        bytes32 senderId = _getUserId(msg.sender);
        uint256 currentBalance = _decryptBalance(senderId);
        _setEncryptedBalance(senderId, currentBalance + amount);
    }

    function unwrap(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        bytes32 senderId = _getUserId(msg.sender);
        uint256 currentBalance = _decryptBalance(senderId);
        if (currentBalance < amount) revert InsufficientBalance();

        _setEncryptedBalance(senderId, currentBalance - amount);
        underlyingToken.transfer(msg.sender, amount);
    }

    // Replay protection signature checking
    function isSignatureUsed(
        SignatureRSV memory signature
    ) external view returns (bool) {
        return _isSignatureUsed(signature);
    }

    // userId lookup via EIP-712 for EOA
    function getMyUserId(
        address user,
        uint256 deadline,
        SignatureRSV memory signature
    ) external view validDeadline(deadline) returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                GET_USER_ID_TYPEHASH,
                user,
                deadline
            )
        );
        if (!_verifySignature(structHash, user, signature)) revert EIPError();
        return _getUserId(user);
    }

    // userId lookup for Smart Contracts (publicly available)
    function getContractUserId(
        address contractAddr
    ) external view returns (bytes32) {
        if (contractAddr.code.length == 0) revert NotContractAddress();
        return _getUserId(contractAddr);
    }
}
