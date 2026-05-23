import { user_oasis_WikiTruth } from "../../account_admin";
import { ethers } from "ethers";
import * as crypto from "crypto";
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 运行：npx hardhat run scripts/utils/convertOasisToEvmPrivateKey.ts

/**
 * 将Oasis私钥转换为EVM私钥
 * Oasis使用Ed25519签名算法，EVM使用secp256k1签名算法
 * 这里通过哈希转换的方式生成EVM兼容的私钥
 */
function convertOasisToEvmPrivateKey(oasisPrivateKey: string): string {
    try {
        // Oasis私钥是Base64编码的，先解码
        const decodedKey = Buffer.from(oasisPrivateKey, 'base64');
        
        // 使用SHA256哈希解码后的私钥，生成32字节的EVM私钥
        const hash = crypto.createHash('sha256').update(decodedKey).digest();
        
        // 转换为十六进制字符串并添加0x前缀
        return '0x' + hash.toString('hex');
    } catch (error) {
        throw new Error(`私钥转换失败: ${error}`);
    }
}

/**
 * 验证EVM私钥并获取地址
 */
function getEvmAddressFromPrivateKey(privateKey: string): string {
    try {
        const wallet = new ethers.Wallet(privateKey);
        return wallet.address;
    } catch (error) {
        throw new Error(`无效的私钥: ${error}`);
    }
}

/**
 * 主函数：转换并显示结果
 */
async function main() {
    console.log("=== Oasis私钥转EVM私钥转换工具 ===\n");
    
    // 获取所有Oasis账户
    const oasisAccounts = user_oasis_WikiTruth;
    
    console.log("转换结果：\n");
    console.log("账户类型".padEnd(12) + "Oasis地址".padEnd(50) + "EVM地址".padEnd(45) + "EVM私钥");
    console.log("-".repeat(120));
    
    for (const [accountType, account] of Object.entries(oasisAccounts)) {
        if (account.privateKey && account.address) {
            try {
                // 转换私钥
                const evmPrivateKey = convertOasisToEvmPrivateKey(account.privateKey);
                
                // 获取EVM地址
                const evmAddress = getEvmAddressFromPrivateKey(evmPrivateKey);
                
                console.log(
                    accountType.padEnd(12) + 
                    account.address.padEnd(50) + 
                    evmAddress.padEnd(45) + 
                    evmPrivateKey
                );
            } catch (error) {
                console.log(
                    accountType.padEnd(12) + 
                    account.address.padEnd(50) + 
                    "转换失败".padEnd(45) + 
                    error
                );
            }
        } else {
            console.log(
                accountType.padEnd(12) + 
                "未配置".padEnd(50) + 
                "未配置".padEnd(45) + 
                "未配置"
            );
        }
    }
    
    console.log("\n=== 转换完成 ===");
    console.log("注意：");
    console.log("1. 这是通过哈希转换生成的EVM私钥，与原Oasis私钥不同");
    console.log("2. 请妥善保管生成的EVM私钥");
    console.log("3. 建议在测试网络上先验证转换结果");
}

// 运行脚本
if (require.main === module) {
    main().catch((error) => {
        console.error("脚本执行失败:", error);
        process.exit(1);
    });
}

export { convertOasisToEvmPrivateKey, getEvmAddressFromPrivateKey };