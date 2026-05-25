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
    error ZeroAddress();
    
    // Master secret for user identity derivation
    bytes32 private _identitySalt;

    constructor(bytes memory pers_) {
        // Initialize the cryptographically secure master secret for identity derivation
        if (_identitySalt == bytes32(0)) {
            _identitySalt = bytes32(Sapphire.randomBytes(32, pers_));
        }
    }

    /**
     * @dev Derive a cryptographically secure, irreversible raw userId from real address
     */
    function _getVirtualAddress(address addr) internal view returns (address) {
        if (addr == address(0)) revert ZeroAddress();

        if (_identitySalt == bytes32(0)) revert EmptyIdentitySalt();

        // Use Keccak256 with private master salt for cryptographically secure derivation inside TEE
        bytes32 id = keccak256(abi.encodePacked("VirtualAddress", _identitySalt, addr));

        return address(uint160(uint256(id)));
    }

}
