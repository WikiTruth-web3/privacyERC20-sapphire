import { ethers } from "hardhat";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { ContractRunner } from "../utils/contract-runner";
import { token_contracts_address } from "../utils/contracts_address";
import { TaskMap, IMockERC20 } from "../types/token-fuctions";

/**
 * MockERC20 (如 OfficialToken) 合约写入操作批处理脚本
 * 运行命令：npx hardhat run scripts/erc20-testnet/mockERC20-write.ts --network sapphire-testnet
 */

const current_executes: (keyof IMockERC20)[] = [
    'mint',
    // 'mintAdmin',
];

async function main() {
    console.log("🚀 开始执行 MockERC20 写入任务...");

    const network = await ethers.provider.getNetwork();
    if (Number(network.chainId) !== 23295) {
        console.error("当前网络ID不是23295，请检查网络配置");
        return;
    }

    const { adminSigner } = await getSigners_SapphireTestnet();

    if (!adminSigner) {
        console.error("未找到有效的签名者");
        return;
    }

    const officialTokenAddr = token_contracts_address.officialToken;

    const all_tasks: TaskMap<IMockERC20> = {
        'mint': {
            taskName: "铸造测试代币 (Public)",
            contractsName: "MockERC20",
            contractAddress: officialTokenAddr,
            functionName: "mint",
            params: [adminSigner.address],
            signer: adminSigner
        },
        'mintAdmin': {
            taskName: "铸造测试代币 (Admin)",
            contractsName: "MockERC20",
            contractAddress: officialTokenAddr,
            functionName: "mintAdmin",
            params: [],
            signer: adminSigner
        },
        'burn': {
            taskName: "销毁代币",
            contractsName: "MockERC20",
            contractAddress: officialTokenAddr,
            functionName: "burn",
            params: [ethers.parseEther("100")],
            signer: adminSigner
        },
        'setMintAmount': {
            taskName: "设置单次铸造金额",
            contractsName: "MockERC20",
            contractAddress: officialTokenAddr,
            functionName: "setMintAmount",
            params: [BigInt(1000)],
            signer: adminSigner
        },
        'setMintPeriod': {
            taskName: "设置铸造冷却周期",
            contractsName: "MockERC20",
            contractAddress: officialTokenAddr,
            functionName: "setMintPeriod",
            params: [BigInt(3600)],
            signer: adminSigner
        }
    };

    const tasks_to_run = current_executes
        .map(key => all_tasks[key])
        .filter(task => task !== undefined);

    if (tasks_to_run.length === 0) {
        console.log("⚠️ 没有匹配的任务需要执行");
        return;
    }

    await ContractRunner.executeBatch(tasks_to_run, 3000);
    console.log("\n✅ MockERC20 写入任务完成");
}

main().catch((error) => {
    console.error("执行过程出错:", error);
    process.exit(1);
});
