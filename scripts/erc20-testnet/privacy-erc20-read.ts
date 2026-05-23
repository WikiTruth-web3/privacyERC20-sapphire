import { ethers } from "hardhat";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { ContractRunner } from "../utils/contract-runner";
import { token_contracts_address } from "../utils/contracts_address";
import { TaskMap, IERC20privacy } from "../types/token-fuctions";
import { buildEIP712Permit, PermitType } from "../utils/eip712-simple";
// import { createEIP712Permit_PrivateToken, PermitType } from "../../utils/getEIP712";
import { core_contracts_address } from "../utils/contracts_address";
/**
 * ERC20privacy (如 SettlementToken) 读取操作批处理脚本
 * 运行命令：npx hardhat run scripts/erc20-testnet/privacy-erc20-read.ts --network sapphire-testnet
 */

const current_executes: (keyof IERC20privacy)[] = [
    // 'balanceOfWithPermit',
    'allowanceWithPermit',
];

async function main() {
    console.log("🔍 开始执行 ERC20privacy 读取任务...");

    const network = await ethers.provider.getNetwork();
    if (Number(network.chainId) !== 23295) {
        console.error("当前网络ID不是23295，请检查网络配置");
        return;
    }

    const { adminSigner, buyerSigner } = await getSigners_SapphireTestnet();
    if (!adminSigner || !buyerSigner) {
        console.error("未找到有效的签名者");
        return;
    }
    // TODO 
    const tokenContractAddr = token_contracts_address.settlementToken;
    const targetContractAddr = token_contracts_address.settlementToken;
    const spender_allowance = core_contracts_address.fundManager;


    console.log("🎫 正在生成 EIP712 VIEW Permit...");
    const viewPermit_allowance = await buildEIP712Permit(
        buyerSigner,
        spender_allowance, // For VIEW, spender shouldn't matter but we pass ZeroAddress
        0, // For VIEW, amount is 0
        PermitType.View,
        targetContractAddr,
        "Secret ERC20 Token",
    );

    const viewPermit_balance = await buildEIP712Permit(
        adminSigner,
        ethers.ZeroAddress, // For VIEW, spender shouldn't matter but we pass ZeroAddress
        0, // For VIEW, amount is 0
        PermitType.View,
        targetContractAddr,
        "Secret ERC20 Token",
    );

    if (!viewPermit_allowance || !viewPermit_balance) {
        console.error("EIP712 Permit 生成失败");
        return;
    }

    const all_tasks: TaskMap<IERC20privacy> = {
        'balanceOfWithPermit': {
            taskName: "获取私有余额 (balanceOfWithPermit)",
            contractsName: "ERC20privacy",
            contractAddress: tokenContractAddr,
            functionName: "balanceOfWithPermit",
            params: [viewPermit_balance],
            signer: adminSigner
        },
        'allowanceWithPermit': {
            taskName: "获取私有授权额度 (allowanceWithPermit)",
            contractsName: "ERC20privacy",
            contractAddress: tokenContractAddr,
            functionName: "allowanceWithPermit",
            params: [viewPermit_allowance],
            signer: adminSigner
        },
        'underlyingToken': {
            taskName: "查询底层代币地址",
            contractsName: "ERC20privacy",
            contractAddress: tokenContractAddr,
            functionName: "underlyingToken",
            params: [],
            signer: adminSigner
        }
    };

    const tasks_to_run = current_executes
        .map(key => all_tasks[key])
        .filter(task => task !== undefined);

    await ContractRunner.executeBatch(tasks_to_run, 1000);
    console.log("\n✅ ERC20privacy 读取任务完成");
}

main().catch((error) => {
    console.error("执行过程出错:", error);
    process.exit(1);
});
