import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../../signers-contracts/erc20_address";
import { getSigners_SapphireTestnet } from "../../signers-contracts/signers-sapphire-testnet";
import { createEIP712Permit, PermitType } from "../../utils/eip712-privacy-erc20";

// npx hardhat test test/privacy-wROSE/02_deposit.test.ts --network sapphire-testnet

// 辅助等待函数，防止 Sapphire 测试网因连续发送交易导致过载
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrivacyWROSE - 虚拟地址基础 ERC20 功能测试", function () {
    // 增加超时时间以适配测试网交易确认
    this.timeout(120000);

    let user0: any;
    let user0_address: any;
    let user0_virtural_address: any;
    let user1: any;
    let user1_address: any;
    let user1_virtural_address: any;
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
        // 初始化签名辅助器，动态获取当前链上 nonce
        createPermitHelper = async (userSigner: any, spender: any, amount: bigint | number, mode: PermitType) => {
            const userAddr = await userSigner.getAddress();
            const nonce = await privacyERC20.nonces(userAddr);
            return createEIP712Permit(
                userSigner,
                spender,
                amount,
                mode,
                privacyERC20_address,
                chainId,
                nonce
            );
        };

        const permit0 = await createPermitHelper(user0, ethers.ZeroAddress, 0, PermitType.VirtualAddress);
        user0_virtural_address = await privacyERC20.getMyVirtualAddress(permit0);

        const permit1 = await createPermitHelper(user1, ethers.ZeroAddress, 0, PermitType.VirtualAddress);
        user1_virtural_address = await privacyERC20.getMyVirtualAddress(permit1);

        // --------------------------------------------------------------------------------------------------

        // 确保 user0 有足够的 wROSE 余额，如果没有则存入少量
        const bal1 = await underlyingERC20.balanceOf(user0_address);
        if (bal1 < ethers.parseEther("2.0")) {
            console.log("正在为 user0 充值少量 native ROSE 转换为 wROSE...");
            const tx = await underlyingERC20.connect(user0).deposit({ value: ethers.parseEther("5.0") });
            await tx.wait();
            await sleep(5000);
        }

        // 确保 user1 有足够的 wROSE 余额
        const bal2 = await underlyingERC20.balanceOf(user1_address);
        if (bal2 < ethers.parseEther("2.0")) {
            console.log("正在为 user1 充值少量 native ROSE 转换为 wROSE...");
            const tx = await underlyingERC20.connect(user1).deposit({ value: ethers.parseEther("5.0") });
            await tx.wait();
            await sleep(5000);
        }

        // 授权 privacyERC20 可以花费 user0 的 wROSE
        const allowance1 = await underlyingERC20.allowance(user0_address, privacyERC20_address);
        if (allowance1 < ethers.parseEther("10.0")) {
            console.log("正在授权 PrivacyWROSE 花费 user0 的 wROSE...");
            const tx = await underlyingERC20.connect(user0).approve(privacyERC20_address, ethers.MaxUint256);
            await tx.wait();
            await sleep(5000);
        }

        // 授权 privacyERC20 可以花费 user1 的 wROSE
        const allowance2 = await underlyingERC20.allowance(user1_address, privacyERC20_address);
        if (allowance2 < ethers.parseEther("10.0")) {
            console.log("正在授权 PrivacyWROSE 花费 user1 的 wROSE...");
            const tx = await underlyingERC20.connect(user1).approve(privacyERC20_address, ethers.MaxUint256);
            await tx.wait();
            await sleep(5000);
        }
    });

    it("应当可以将 wROSE 包装（wrap）为加密的隐私余额", async function () {

        // 使用 VIEW 签名去查看余额
        const balancePermit = await createPermitHelper(user0, user0_virtural_address, 0, PermitType.View);
        const balBefore = await privacyERC20.balanceOfWithPermit(balancePermit);

        // 执行 wrap 操作
        const wrapTx = await privacyERC20_user0.wrap(wrapAmount);
        await wrapTx.wait();
        await sleep(5000);

        const balAfter = await privacyERC20.balanceOfWithPermit(balancePermit);
        expect(balAfter - balBefore).to.equal(wrapAmount);
    });

    it("应当可以将隐私代币解包（unwrap）退回 wROSE 余额", async function () {


        const balancePermit = await createPermitHelper(user0, user0_virtural_address, 0, PermitType.View);
        const balBefore = await privacyERC20.balanceOfWithPermit(balancePermit);

        // 解包退回一半 wrap 的代币
        const unwrapAmount = wrapAmount / 2n;
        const unwrapTx = await privacyERC20_user0.unwrap(unwrapAmount);
        await unwrapTx.wait();
        await sleep(5000);

        const balAfter = await privacyERC20.balanceOfWithPermit(balancePermit);
        expect(balBefore - balAfter).to.equal(unwrapAmount);
    });

    it("应当支持直接存款（deposit） native ROSE 并获得隐私代币余额", async function () {


        const balancePermit = await createPermitHelper(user0, user0_virtural_address, 0, PermitType.View);
        const balBefore = await privacyERC20.balanceOfWithPermit(balancePermit);
        const depAmount = ethers.parseEther("0.1"); // 存入 0.1 ROSE

        const tx = await privacyERC20_user0.deposit({ value: depAmount });
        await tx.wait();
        await sleep(5000);

        const balAfter = await privacyERC20.balanceOfWithPermit(balancePermit);
        expect(balAfter - balBefore).to.equal(depAmount);
    });

    it("应当支持直接提款（withdraw） native ROSE", async function () {

        const balancePermit = await createPermitHelper(user0, user0_virtural_address, 0, PermitType.View);
        const balBefore = await privacyERC20.balanceOfWithPermit(balancePermit);
        const wdrAmount = ethers.parseEther("0.05"); // 提取 0.05 ROSE

        const tx = await privacyERC20_user0.withdraw(wdrAmount);
        await tx.wait();
        await sleep(5000);

        const balAfter = await privacyERC20.balanceOfWithPermit(balancePermit);
        expect(balBefore - balAfter).to.equal(wdrAmount);
    });

    it("当非拥有者（EOA）尝试公开调用 balanceOf 时应当返回 0 以保护隐私", async function () {
        const user0Address = user0_address;
        const balance = await privacyERC20_user1.balanceOf(user0Address);
        expect(Number(balance)).to.equal(0);
    });

});
