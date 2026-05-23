import { ethers } from "hardhat";
import { Signer } from "ethers";

/**
 * EIP712许可类型枚举
 */
export enum PermitType {
    View = 0,
    Transfer = 1,
    Approve = 2
}

/**
 * EIP712签名结果接口
 */
export interface EIP712SignatureResult {
    signature: string; // 完整的签名字符串
    r: string;
    s: string;
    v: number;
    domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: string;
    };
    value: {
        label: number;
        owner: string;
        spender: string;
        amount: bigint;
        deadline: number;
    };
}

/**
 * 简单的EIP712签名函数
 * 
 * @param signer 签名者
 * @param spender 授权接收者地址
 * @param amount 授权金额
 * @param permitType 许可类型 (0=View, 1=Transfer, 2=Approve)
 * @param contractAddress 合约地址
 * @param domainName 域名
 * @param domainVersion 域版本，默认为 "1"
 * @param deadline 截止时间（Unix时间戳），默认1小时后
 * @returns EIP712签名结果
 */
export async function signEIP712(
    signer: Signer,
    spender: string,
    amount: bigint | number,
    permitType: PermitType,
    contractAddress: string,
    domainName?: string,
    domainVersion?: string,
    deadline?: number
): Promise<EIP712SignatureResult> {
    // 获取签名者地址
    const owner = await signer.getAddress();

    // 获取链ID
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    const defaultDomainName = domainName || "Privacy ERC20 Token";
    const defaultDomainVersion = domainVersion || "1";

    // 设置截止时间（默认1小时后）
    const finalDeadline = deadline || Math.floor(Date.now() / 1000) + 3600;

    // 创建EIP712域
    const domain = {
        name: defaultDomainName,
        version: defaultDomainVersion,
        chainId: chainId,
        verifyingContract: contractAddress
    };

    // EIP712类型定义
    const types = {
        EIP712Permit: [
            { name: "label", type: "uint8" },
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };

    // 签名值
    const value = {
        label: permitType,
        owner: owner,
        spender: spender,
        amount: BigInt(amount),
        deadline: finalDeadline
    };

    // 执行EIP712签名
    const signature = await signer.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    return {
        signature: signature,
        r: sig.r,
        s: sig.s,
        v: sig.v,
        domain: domain,
        value: value
    };
}

/**
 * 构建EIP712Permit
 */
export async function buildEIP712Permit(
    signer: Signer,
    spender: string,
    amount: bigint | number,
    permitType: PermitType,
    contractAddress: string,
    domainName?: string,
    domainVersion?: string,
    deadline?: number
): Promise<any | null> {

    try {
        const eip712Result = await signEIP712(
            signer,
            spender, // 在transfer中，spender就是接收者地址
            amount,
            permitType,
            contractAddress,
            domainName,
            domainVersion,
            deadline
        );

        // 构建EIP712Permit结构体
        const permit = {
            label: eip712Result.value.label, // PermitLabel.TRANSFER = 1
            owner: eip712Result.value.owner,
            spender: eip712Result.value.spender,
            amount: eip712Result.value.amount,
            deadline: eip712Result.value.deadline,
            signature: {
                r: eip712Result.r,
                s: eip712Result.s,
                v: eip712Result.v
            }
        };
        return permit;
    } catch (error) {
        console.error("构建EIP712Permit失败:", error);
        return null;
    }
}

/**
 * 验证EIP712签名
 * 
 * @param domain EIP712域配置
 * @param types 类型定义
 * @param value 签名值
 * @param signature 签名字符串
 * @param expectedAddress 期望的签名者地址
 * @returns 验证是否通过
 */
export async function verifyEIP712(
    domain: any,
    types: Record<string, any[]>,
    value: Record<string, any>,
    signature: string,
    expectedAddress: string
): Promise<boolean> {
    try {
        const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
        return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
        console.error("签名验证失败:", error);
        return false;
    }
}