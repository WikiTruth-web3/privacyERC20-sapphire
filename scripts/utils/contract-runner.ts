import { ethers } from "hardhat";
import { core_contracts_address, token_contracts_address } from "./contracts_address";

import { CallFunctionParams } from "../types/call-params";

/**
 * 通用合约执行器
 * 负责合约实例化、函数调用、交易等待及统一日志记录
 */
export class ContractRunner {
    
    /**
     * 执行合约函数
     * @param params 调用参数
     */
    static async execute(params: CallFunctionParams) {
        const { contractsName, contractAddress, functionName, params: funcArgs, signer } = params;

        // 1. 获取合约地址 (优先级: 参数传入 > 配置文件定义)
        // 支持模糊匹配：尝试 PascalCase 和 camelCase
        const lowerFirst = contractsName.charAt(0).toLowerCase() + contractsName.slice(1);
        const address = contractAddress 
            || (core_contracts_address as any)[contractsName] 
            || (core_contracts_address as any)[lowerFirst]
            || (token_contracts_address as any)[contractsName]
            || (token_contracts_address as any)[lowerFirst];

        if (!address) {
            throw new Error(`未找到合约 "${contractsName}" 的地址，请在参数、core_contracts_address 或 token_contracts_address 中提供。`);
        }


        console.log(`\n[ContractRunner] 准备执行: ${contractsName}.${String(functionName)}`);
        console.log(`[ContractRunner] 合约地址: ${address}`);
        if (signer) {
            console.log(`[ContractRunner] 使用签名者: ${signer.address}`);
        }

        // 2. 实例化合约
        // 注意：这里假设 contractsName 对应的就是合约的 Artifact 名称
        // 如果不一样（例如 MockERC20 部署为 OfficialToken），建议在 params 中增加 fileName 字段
        const contractFactory = await ethers.getContractAt(contractsName, address);
        const contract = signer ? contractFactory.connect(signer) : contractFactory;

        // 3. 动态调用函数
        if (typeof (contract as any)[functionName] !== 'function') {
            throw new Error(`合约 "${contractsName}" 中不存在函数 "${String(functionName)}"`);
        }


        try {
            // 支持 payable 的 value overrides
            const overrides = params.value ? { value: params.value } : undefined;
            const argsWithOverrides = overrides ? [...funcArgs, overrides] : funcArgs;
            const result = await (contract as any)[functionName](...argsWithOverrides);

            // 4. 处理返回结果
            if (result && typeof result.wait === 'function') {
                // 这是一个交易 (Write 操作)
                console.log(`[ContractRunner] 交易已发出，Hash: ${result.hash}`);
                console.log(`[ContractRunner] 正在等待交易确认...`);
                const receipt = await result.wait();
                console.log(`[ContractRunner] ✅ 交易执行成功，区块: ${receipt.blockNumber}`);
                return receipt;
            } else {
                // 这是一个查询 (Read 操作)
                console.log(`[ContractRunner] ✅ 查询成功，返回结果:`, result);
                return result;
            }
        } catch (error: any) {
            console.error(`[ContractRunner] ❌ 执行失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 批量执行合约函数
     * @param tasks 任务数组
     * @param delayMs 任务间的延迟时间 (毫秒)，默认 5000ms
     */
    static async executeBatch(tasks: CallFunctionParams[], delayMs: number = 5000) {
        console.log(`\n[ContractRunner] 🚀 开始执行批量任务，总计: ${tasks.length} 个`);
        
        const results = [];
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const taskLabel = task.taskName ? `[${task.taskName}]` : `任务 ${i + 1}`;
            
            console.log(`\n--- ${taskLabel} ---`);
            try {
                const result = await this.execute(task);
                results.push({ success: true, task: taskLabel, data: result });
            } catch (error: any) {
                console.error(`\n[ContractRunner] 🛑 批量任务在 ${taskLabel} 处中断`);
                results.push({ success: false, task: taskLabel, error: error.message });
                // 批量任务中某个失败通常建议中断，避免后续逻辑依赖错误状态
                throw error; 
            }

            if (i < tasks.length - 1 && delayMs > 0) {
                console.log(`[ContractRunner] 等待 ${delayMs}ms 后执行下一个任务...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        console.log(`\n[ContractRunner] ✨ 所有批量任务执行完毕！`);
        return results;
    }
}

