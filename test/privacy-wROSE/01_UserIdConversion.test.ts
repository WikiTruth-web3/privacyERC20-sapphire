import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../../signers-contracts/erc20_address";
import { getSigners_SapphireTestnet } from "../../signers-contracts/signers-sapphire-testnet";
import { createEIP712Permit, PermitType } from "../../utils/eip712-privacy-erc20";

// npx hardhat test test/privacy-wROSE/01_UserIdConversion.test.ts --network sapphire-testnet

// 辅助等待函数，防止 Sapphire 测试网因连续发送交易导致过载
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrivacyWROSE - 虚拟地址转换与查询测试", function () {
    // 增加超时时间以适配测试网交易确认
    this.timeout(20000);

    let user0: any;
    let user0_address: any;
    let user1: any;
    let user1_address: any;
    // --------------------------
    let underlyingERC20: any;
    let underlyingERC20_address: any;
    let privacyERC20: any;
    let privacyERC20_address: any;
    let privacyERC20_user0: any;
    let privacyERC20_user1: any;
    let chainId: number;
    let createPermitHelper: (userSigner: any, spender: any, amount: bigint | number, mode: PermitType) => Promise<any>;
    
    // -----------------------------------------------------------------
    // 减小测试资金，防范测试网测试币归零
    const wrapAmount = ethers.parseEther("0.1"); // wrap 0.1 wROSE
    const transferAmount = ethers.parseEther("0.02"); // 转账 0.02 wROSE

    before(async function () {
        const network = await ethers.provider.getNetwork();
        chainId = Number(network.chainId);
        console.log(`🌐 当前测试网络: ${network.name || "Hardhat"}, 链 ID: ${chainId}`);

        // 获取测试账户
        const signers = await getSigners_SapphireTestnet();
        if (signers.erc20_deployer_Signer && signers.erc20_user_01_Signer) {
            user0 = signers.erc20_deployer_Signer;
            user1 = signers.erc20_user_01_Signer;
            console.log(`使用 Sapphire 测试网账户进行测试`);
        } else {
            const localSigners = await ethers.getSigners();
            user0 = localSigners[0];
            user1 = localSigners[1];
            console.log(`使用本地 Hardhat 账户进行测试`);
        }


        user0_address = await user0.getAddress();
        user1_address = await user1.getAddress();

        // 连接已部署合约
        underlyingERC20 = await ethers.getContractAt("contracts/WrappedROSE.sol:WrappedROSE", erc20_address_testnet.wROSE);
        privacyERC20 = await ethers.getContractAt("contracts/PrivacyWROSE.sol:PrivacyWROSE", erc20_address_testnet.PrivacyWROSE);

        privacyERC20_user0 = privacyERC20.connect(user0)
        privacyERC20_user1 = privacyERC20.connect(user1)
        underlyingERC20_address  = await underlyingERC20.getAddress()
        privacyERC20_address = await privacyERC20.getAddress()
    });

    it("当签名无效或过期时，getMyVirtualAddress 应当调用失败 (revert)", async function () {
        const badSig = {
            r: ethers.ZeroHash,
            s: ethers.ZeroHash,
            v: 27
        };
        const user0Address = await user0.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        // 构造一个错误的签名 permit 结构
        const badPermit = {
            label: PermitType.VirtualAddress,
            owner: user0Address,
            spender: ethers.ZeroAddress,
            amount: 0n,
            deadline: deadline,
            nonce: 0n,
            signature: badSig
        };

        let threw = false;
        try {
            await privacyERC20.getMyVirtualAddress(badPermit);
        } catch (e) {
            threw = true;
        }
        expect(threw).to.be.true;
    });

    it("使用正确的 EIP712 签名可以安全地获取用户自己的虚拟隐私地址", async function () {

        const users = [user0, user1]
        const contractAddress = await privacyERC20.getAddress()


        for (const user of users) {
            const userAddress = await user.getAddress();
            const nonce = await privacyERC20.nonces(userAddress);
            // 构造用于获取虚拟地址 of EIP712 签名，spender 为零地址，amount 为 0，label 为 VirtualAddress
            const permit = await createEIP712Permit(
                user,
                ethers.ZeroAddress,
                0,
                PermitType.VirtualAddress,
                contractAddress,
                chainId,
                nonce
            );

            const virtualAddr = await privacyERC20.getMyVirtualAddress(permit);
            expect(virtualAddr).to.not.equal(ethers.ZeroAddress);
            console.log(`用户真实地址: ${userAddress}`);
            console.log(`对应隐私虚拟地址: ${virtualAddr}`);

            await sleep(5000);

        }
    });

});
