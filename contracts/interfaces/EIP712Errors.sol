// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.24;

interface EIP712Errors {
    /// Invalid permit label
    error InvalidPermitLabel();
    /// Invalid permit amount
    error InvalidPermitAmount();
    /// EIP error
    error EIPError();
    /// Signature used
    error SignatureUsed();
    /// Expired deadline
    error ExpiredDeadline();

    /// Invalid signature
    error InvalidSignature();
    /// Invalid nonce
    error InvalidNonce();
}
