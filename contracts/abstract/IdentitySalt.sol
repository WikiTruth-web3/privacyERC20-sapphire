// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {
    Sapphire
} from "@oasisprotocol/sapphire-contracts/contracts/Sapphire.sol";

/**
 * @title IdentitySalt
 * @notice Provides Oasis Sapphire KDF-based random userId generation capability
 */
abstract contract IdentitySalt {
    error EmptyIdentitySalt();
    
    // Master secret for user identity derivation
    bytes32 private _identitySalt;

    constructor(bytes memory pers_) {
        // Initialize the cryptographically secure master secret for identity derivation
        if (_identitySalt == bytes32(0)) {
            _identitySalt = bytes32(Sapphire.randomBytes(32, pers_));
        }
    }

    /**
     * @dev Derive a cryptographically secure, irreversible userId from address
     */
    function _getUserId(address user_) internal view returns (bytes32) {
        if (user_ == address(0)) return bytes32(0);

        if (_identitySalt == bytes32(0)) revert EmptyIdentitySalt();

        // Convert address to bytes32 to use as salt/context for derivation
        bytes32 contextSalt = bytes32(uint256(uint160(user_)));

        // Use Sapphire's native HKDF-based symmetric key derivation
        return
            Sapphire.deriveSymmetricKey(
                Sapphire.Curve25519PublicKey.wrap(contextSalt),
                Sapphire.Curve25519SecretKey.wrap(_identitySalt)
            );
    }
}
