import { ethers } from "hardhat";
import { Signer } from "ethers";

export enum PermitType {
    View = 0,
    Transfer = 1,
    Approve = 2,
    VirtualAddress = 3
}

export interface EIP712Domain {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
}

export interface EIP712PermitResult {
    label: PermitType;
    owner: string;
    spender: string;
    amount: bigint;
    deadline: number;
    signature: {
        r: string;
        s: string;
        v: number;
    };
}

/**
 * Generate EIP-712 Permit signature for PrivacyERC20WithUserId
 */
export async function createEIP712Permit(
    signer: Signer,
    spender: Signer | string,
    amount: bigint | number,
    mode: PermitType,
    contractAddress: string,
    chainId: number,
    customDeadline?: number
): Promise<EIP712PermitResult> {
    const signerAddress = await signer.getAddress();
    const spenderAddress = typeof spender === "string" ? spender : await spender.getAddress();
    const deadline = customDeadline || Math.floor(Date.now() / 1000) + 3600;

    const domain: EIP712Domain = {
        name: "Privacy ERC20 Token with Virtual Address",
        version: "1",
        chainId: chainId,
        verifyingContract: contractAddress
    };

    const types = {
        EIP712Permit: [
            { name: "label", type: "uint8" },
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };

    const value = {
        label: mode,
        owner: signerAddress,
        spender: spenderAddress,
        amount: BigInt(amount),
        deadline: deadline
    };

    const rawSignature = await signer.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(rawSignature);

    return {
        label: mode,
        owner: signerAddress,
        spender: spenderAddress,
        amount: BigInt(amount),
        deadline: deadline,
        signature: {
            r: sig.r,
            s: sig.s,
            v: sig.v
        }
    };
}

