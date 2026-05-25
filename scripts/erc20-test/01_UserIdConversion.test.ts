import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../utils/erc20_address";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { createEIP712Permit, PermitType } from "../utils/privacyUtils";

// 辅助等待函数，防止 Sapphire 测试网因连续发送交易导致过载
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrivacyWROSE - 虚拟地址转换与查询测试", function () {
    // 增加超时时间以适配测试网交易确认
    this.timeout(120000);

    let admin: any;
    let user1: any;
    let underlyingToken: any;
    let privacyToken: any;
    let chainId: number;

    before(async function () {
        const network = await ethers.provider.getNetwork();
        chainId = Number(network.chainId);
        console.log(`🌐 当前测试网络: ${network.name || "Hardhat"}, 链 ID: ${chainId}`);

        // 获取测试账户
        const signers = await getSigners_SapphireTestnet();
        if (signers.erc20_deployer_Signer) {
            admin = signers.erc20_deployer_Signer;
            user1 = signers.erc20_deployer_Signer;
            console.log(`使用 Sapphire 测试网账户进行测试`);
        } else {
            const localSigners = await ethers.getSigners();
            admin = localSigners[0];
            user1 = localSigners[0];
            console.log(`使用本地 Hardhat 账户进行测试`);
        }

        // 连接已部署合约
        underlyingToken = await ethers.getContractAt("contracts/WrappedROSE.sol:WrappedROSE", erc20_address_testnet.wROSE);
        privacyToken = await ethers.getContractAt("contracts/PrivacyWROSE.sol:PrivacyWROSE", erc20_address_testnet.PrivacyWROSE);
    });

    it("当签名无效或过期时，getMyVirtualAddress 应当 revert 并抛出 EIPError", async function () {
        const badSig = {
            r: ethers.ZeroHash,
            s: ethers.ZeroHash,
            v: 27
        };
        const user1Address = await user1.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        // 构造一个错误的签名 permit 结构
        const badPermit = {
            label: PermitType.VirtualAddress,
            owner: user1Address,
            spender: ethers.ZeroAddress,
            amount: 0n,
            deadline: deadline,
            signature: badSig
        };

        await expect(
            privacyToken.getMyVirtualAddress(badPermit)
        ).to.be.revertedWithCustomError(privacyToken, "EIPError");
    });

    it("使用正确的 EIP712 签名可以安全地获取用户自己的虚拟隐私地址", async function () {
        const user1Address = await user1.getAddress();
        
        // 构造用于获取虚拟地址的 EIP712 签名，spender 为零地址，amount 为 0，label 为 VirtualAddress
        const permit = await createEIP712Permit(
            user1,
            ethers.ZeroAddress,
            0,
            PermitType.VirtualAddress,
            await privacyToken.getAddress(),
            chainId
        );

        const virtualAddr = await privacyToken.getMyVirtualAddress(permit);
        expect(virtualAddr).to.not.equal(ethers.ZeroAddress);
        console.log(`用户真实地址: ${user1Address}`);
        console.log(`对应隐私虚拟地址: ${virtualAddr}`);
    });

});
