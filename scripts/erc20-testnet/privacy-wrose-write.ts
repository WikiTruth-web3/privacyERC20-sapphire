import { ethers } from "hardhat";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { ContractRunner } from "../utils/contract-runner";
import { token_contracts_address } from "../utils/contracts_address";
import { TaskMap, IWROSEprivacy } from "../types/privacy-erc20-fuctions";
import { buildEIP712Permit, PermitType } from "../utils/eip712-simple";

/**
 * WROSEprivacy 写入操作批处理脚本
 * 运行命令：npx hardhat run scripts/erc20-testnet/privacy-wrose-write.ts --network sapphire-testnet
 */

const current_executes: (keyof IWROSEprivacy)[] = [
    'deposit',
    // 'withdraw',
];

async function main() {
    console.log("🚀 开始执行 WROSEprivacy 写入任务...");

    const network = await ethers.provider.getNetwork();
    if (Number(network.chainId) !== 23295) {
        console.error("当前网络ID错误");
        return;
    }

    const { adminSigner, buyerSigner } = await getSigners_SapphireTestnet();
    if (!adminSigner || !buyerSigner) {
        console.error("未找到有效的 adminSigner 或 buyerSigner");
        return;
    }
    const wroseAddr = token_contracts_address.wrosePrivacy;
    const testAmount = ethers.parseEther("1");

    console.log("🎫 正在生成 EIP712 TRANSFER Permit (wROSE)...");
    const transferPermit = await buildEIP712Permit(
        adminSigner,
        buyerSigner.address,
        testAmount,
        PermitType.Transfer,
        wroseAddr,
        "Privacy ERC20 Token wROSE"
    );

    const all_tasks: TaskMap<IWROSEprivacy> = {
        'deposit': {
            taskName: "存入原生 ROSE Token (Deposit)",
            contractsName: "WROSEprivacy",
            contractAddress: wroseAddr,
            functionName: "deposit",
            params: [],
            value: testAmount, // 通过 value 字段传送原生代币
            signer: adminSigner
        },
        'withdraw': {
            taskName: "提取原生 ROSE Token (Withdraw)",
            contractsName: "WROSEprivacy",
            contractAddress: wroseAddr,
            functionName: "withdraw",
            params: [testAmount],
            signer: adminSigner
        },
        'transferWithPermit': {
            taskName: "带签名的 WROSE 隐私转账",
            contractsName: "WROSEprivacy",
            contractAddress: wroseAddr,
            functionName: "transferWithPermit",
            params: [transferPermit],
            signer: adminSigner
        }
    };

    // 对于 deposit 这样本身自带 value (payable) 的调用，我们需要特别构造或暂时通过 ContractRunner 原生接口之外去支持它。
    // 为了简单且符合现有的 ContractRunner 设计，暂改 deposit 的 params 为 value 传参。但在 Interface 中不支持。
    // 在这里我们暂且正常发送
    const tasks_to_run = current_executes
        .map(key => all_tasks[key])
        .filter(task => task !== undefined);

    await ContractRunner.executeBatch(tasks_to_run, 5000);
    console.log("\n✅ WROSEprivacy 写入任务完成");
}

main().catch((error) => {
    console.error("执行过程出错:", error);
    process.exit(1);
});
