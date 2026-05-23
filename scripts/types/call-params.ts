import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * 传递与智能合约交互的参数
 */

export interface CallFunctionParams<T = any, K extends keyof T = keyof T> {
    taskName?: string; // 任务描述，用于日志输出
    contractsName: string;
    contractAddress?: string; // 可选，用于覆盖默认合约地址
    functionName: K;
    params: T[K] extends (...args: any[]) => any ? Parameters<T[K]> : any[];
    value?: bigint | string; // 可选，针对 payable 函数发送的原生代币金额
    signer: HardhatEthersSigner | null;
}


