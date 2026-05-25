// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {
    SignatureRSV
} from "@oasisprotocol/sapphire-contracts/contracts/EthereumUtils.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Errors} from "../interfaces/EIP712Errors.sol";

/**
 * @title PrivacyEIP712
 * @notice Abstract contract handles EIP-712 domain separation, signature recovery, and validation
 */
abstract contract PrivacyEIP712 is EIP712Errors {
    // EIP-712 domain parameters
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 public immutable DOMAIN_SEPARATOR;

    bytes32 public constant EIP_PERMIT_TYPEHASH =
        keccak256(
            "EIP712Permit(uint8 label,address owner,address spender,uint256 amount,uint256 deadline,uint256 nonce)"
        );

    enum PermitLabel {
        VIEW,
        TRANSFER,
        APPROVE,
        VIRTUAL_ADDRESS
    }

    struct EIP712Permit {
        PermitLabel label;
        address owner;
        address spender;
        uint256 amount;
        uint256 deadline;
        uint256 nonce;
        SignatureRSV signature;
    }

    // Replay protection for signatures
    mapping(bytes32 => bool) internal _usedSignatures;

    // Nonces for EIP712 permits
    mapping(address => uint256) private _nonces;

    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner];
    }

    function increaseNonce() external {
        _nonces[msg.sender]++;
    }

    // ====================================================================================================


    constructor(string memory name, string memory version) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                block.chainid,
                address(this)
            )
        );
    }

        modifier validDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert ExpiredDeadline();
        _;
    }

    // Modifiers
    modifier uniqueSignature(SignatureRSV memory signature) {
        _checkSignatureUsed(signature);
        _;
        _usedSignatures[_getHash(signature)] = true;
    }


    /**
     * @dev Verify typed data signature (EIP-712)
     */
    function _verifySignature(
        bytes32 structHash,
        address owner,
        SignatureRSV memory rsv
    ) internal view returns (bool) {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        return owner == ECDSA.recover(digest, uint8(rsv.v), rsv.r, rsv.s);
    }

    /**
     * @dev Validate the permit structure details and signature
     */
    function _verifyPermit(
        EIP712Permit memory permit,
        PermitLabel label_
    ) internal view validDeadline(permit.deadline) returns (bool) {
        if (label_ != permit.label) revert InvalidPermitLabel();
        if (permit.nonce != _nonces[permit.owner]) revert InvalidNonce();
        if (permit.label == PermitLabel.VIEW) {
            if (permit.amount != 0) revert InvalidPermitAmount();
        }
        if (permit.label == PermitLabel.VIRTUAL_ADDRESS) {
            if (permit.amount != 0) revert InvalidPermitAmount();
            if (permit.spender != address(0)) revert InvalidPermitAmount();
        }

        bytes32 structHash = keccak256(
            abi.encode(
                EIP_PERMIT_TYPEHASH,
                permit.label,
                permit.owner,
                permit.spender,
                permit.amount,
                permit.deadline,
                permit.nonce
            )
        );

        return _verifySignature(structHash, permit.owner, permit.signature);
    }

        // Replay protection signature checking
    function _getHash(
        SignatureRSV memory signature
    ) internal pure returns (bytes32) {
        return
            keccak256(abi.encodePacked(signature.r, signature.s, signature.v));
    }

    function _isSignatureUsed(
        SignatureRSV memory signature
    ) internal view returns (bool) {
        bytes32 sigHash = _getHash(signature);
        return _usedSignatures[sigHash];
    }

    function _checkSignatureUsed(
        SignatureRSV memory signature
    ) internal view returns (bool) {
        bool isUsed = _isSignatureUsed(signature);
        if (isUsed) revert InvalidSignature();
        return isUsed;
    }
}
