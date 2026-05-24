import { ethers } from "hardhat";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { ContractRunner } from "../utils/contract-runner";
import { token_contracts_address, core_contracts_address } from "../utils/contracts_address";
import { TaskMap, IERC20privacy } from "../types/privacy-erc20-fuctions";

import { buildEIP712Permit, PermitType } from "../utils/eip712-simple";

/**
 * ERC20privacy 写入操作批处理脚本
 * 运行命令：npx hardhat run scripts/erc20-testnet/privacy-erc20-write.ts --network sapphire-testnet
 */

const current_executes: (keyof IERC20privacy)[] = [
    // 'wrap',
    // 'transferWithPermit',
    // 'unwrap',
    'approveWithPermit'
];

async function main() {
    console.log("🚀 开始执行 ERC20privacy 写入任务...");

    const network = await ethers.provider.getNetwork();
    if (Number(network.chainId) !== 23295) {
        console.error("当前网络ID不是23295");
        return;
    }

    const { adminSigner, buyerSigner } = await getSigners_SapphireTestnet();
    if (!adminSigner || !buyerSigner) {
        console.error("未找到有效的 adminSigner 或 buyerSigner");
        return;
    }
    const targetTokenAddr = token_contracts_address.settlementToken;
    const testAmount = ethers.parseEther("10");
    const spender_approve = core_contracts_address.fundManager;
    const amount_approve = ethers.parseEther("20");


    console.log("🎫 正在生成 EIP712 TRANSFER Permit...");
    const transferPermit = await buildEIP712Permit(
        adminSigner,
        buyerSigner.address, // transfer to buyer
        testAmount,
        PermitType.Transfer,
        targetTokenAddr,
        "Secret ERC20 Token" // this is old contract, new contract is "Privacy ERC20 Token" 
    );

    if (!transferPermit) {
        console.error("EIP712 Permit 生成失败");
        return;
    }

    const approvePermit = await buildEIP712Permit(
        buyerSigner,
        spender_approve,
        amount_approve,
        PermitType.Approve,
        targetTokenAddr,
        "Secret ERC20 Token" // this is old contract, new contract is "Privacy ERC20 Token" 
    );

    if (!approvePermit) {
        console.error("EIP712 Permit 生成失败");
        return;
    }

    const all_tasks: TaskMap<IERC20privacy> = {
        'wrap': {
            taskName: "包装代币 (Wrap)",
            contractsName: "ERC20privacy",
            contractAddress: targetTokenAddr,
            functionName: "wrap",
            params: [testAmount],
            signer: adminSigner
        },
        'unwrap': {
            taskName: "解包代币 (Unwrap)",
            contractsName: "ERC20privacy",
            contractAddress: targetTokenAddr,
            functionName: "unwrap",
            params: [testAmount],
            signer: adminSigner
        },
        'transferWithPermit': {
            taskName: "带签名的隐私转账 (transferWithPermit)",
            contractsName: "ERC20privacy",
            contractAddress: targetTokenAddr,
            functionName: "transferWithPermit",
            params: [transferPermit],
            signer: adminSigner // 可以由任何人代发交易，这里用 admin 发送作为演示
        },
        'approveWithPermit': {
            taskName: "带签名的隐私授权 (approveWithPermit)",
            contractsName: "ERC20privacy",
            contractAddress: targetTokenAddr,
            functionName: "approveWithPermit",
            params: [approvePermit],
            signer: adminSigner
        }
    };

    const tasks_to_run = current_executes
        .map(key => all_tasks[key])
        .filter(task => task !== undefined);

    await ContractRunner.executeBatch(tasks_to_run, 5000);
    console.log("\n✅ ERC20privacy 写入任务完成");
}

main().catch((error) => {
    console.error("执行过程出错:", error);
    process.exit(1);
});
