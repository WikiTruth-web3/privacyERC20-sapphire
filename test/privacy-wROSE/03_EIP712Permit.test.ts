import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../../signers-contracts/erc20_address";
import { getSigners_SapphireTestnet } from "../../signers-contracts/signers-sapphire-testnet";
import { createEIP712Permit, PermitType } from "../../utils/eip712-privacy-erc20";


// npx hardhat test test/privacy-wROSE/03_EIP712Permit.test.ts --network sapphire-testnet
// 辅助等待函数，防止 Sapphire 测试网因连续发送交易导致过载
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrivacyWROSE - EIP712 签名授权 (Permit) 功能测试", function () {
    // 增加超时时间以适配测试网交易确认
    this.timeout(300000);

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

    // 减小测试资金，防范测试网测试币归零
    const wrapAmount = ethers.parseEther("0.1"); // wrap 0.1 wROSE
    const transferAmount = ethers.parseEther("0.02"); // 划转 0.02 wROSE

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

        // 确保 user0 有足够的 wROSE 余额
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

        const viewPermit = await createPermitHelper(user0, user0_virtural_address, 0, PermitType.View);
        const pBal = await privacyERC20.balanceOfWithPermit(viewPermit);
        if (pBal < ethers.parseEther("0.5")) {
            console.log("正在将 user0 的 wROSE 注入隐私余额中...");
            const tx = await privacyERC20_user0.wrap(ethers.parseEther("1.0"));
            await tx.wait();
            await sleep(5000);
        }
    });

    // it("应当能够使用 EIP-712 签名 (VIEW) 查询普通 EOA 的加密余额", async function () {

    //     const viewPermit = await createPermitHelper(user0, user0_virtural_address, 0, PermitType.View);

    //     const balance = await privacyERC20_user1.balanceOfWithPermit(viewPermit);
    //     expect(balance).to.be.greaterThanOrEqual(0n);
    // });

    // it("应当能够使用 EIP-712 签名 (VIEW) 查询对虚拟 spender 地址的授权额度", async function () {

    //     const viewPermit = await createPermitHelper(user0, user1_virtural_address, 0, PermitType.View);

    //     const allowance = await privacyERC20_user1.allowanceWithPermit(viewPermit);
    //     expect(allowance).to.be.greaterThanOrEqual(0n);
    // });

    // it("应当允许使用带有接收方虚拟地址的 transferWithPermit 签名进行转账", async function () {

    //     // 构造 VIEW 余额查询 Permit
    //     const viewPermit0 = await createPermitHelper(user0, user0_virtural_address, 0, PermitType.View);
    //     const viewPermit1 = await createPermitHelper(user1, user1_virtural_address, 0, PermitType.View);
        
    //     const bal0Before = await privacyERC20.balanceOfWithPermit(viewPermit0);
    //     const bal1Before = await privacyERC20.balanceOfWithPermit(viewPermit1);

    //     // 创建 transfer 签名
    //     const permit = await createPermitHelper(user0, user1_virtural_address, transferAmount, PermitType.Transfer);

    //     // 任何人都可以递交此签名（此处由 user1 发送）来执行转账
    //     const tx = await privacyERC20_user1.transferWithPermit(permit);
    //     await tx.wait();
    //     await sleep(5000);

    //     const bal0After = await privacyERC20.balanceOfWithPermit(viewPermit0);
    //     const bal1After = await privacyERC20.balanceOfWithPermit(viewPermit1);

    //     expect(bal0Before - bal0After).to.equal(transferAmount);
    //     expect(bal1After - bal1Before).to.equal(transferAmount);
    // });

    // it("应当允许使用带有 spender 虚拟地址的 approveWithPermit 签名进行额度授权", async function () {

    //     // 创建 approve 签名
    //     const permit = await createPermitHelper(user0, user1_virtural_address, transferAmount, PermitType.Approve);

    //     // 执行 approveWithPermit
    //     const tx = await privacyERC20_user1.approveWithPermit(permit);
    //     await tx.wait();
    //     await sleep(5000);

    //     // 查询授权额度
    //     const viewPermitForAllowance = await createPermitHelper(user0, user1_virtural_address, 0, PermitType.View);
    //     const allowance = await privacyERC20_user1.allowanceWithPermit(viewPermitForAllowance);
    //     expect(allowance).to.equal(transferAmount);
    // });

    // it("同一签名多次提交应该被 uniqueSignature 拦截（防双花）", async function () {

    //     // A 生成授权给 B 虚拟地址的 approve 签名
    //     const permit = await createPermitHelper(user0, user1_virtural_address, transferAmount, PermitType.Approve);

    //     // 第一次执行，预期成功
    //     const tx = await privacyERC20_user1.approveWithPermit(permit);
    //     await tx.wait();
    //     await sleep(5000);

    //     // 紧接着第二次提交同样的签名，预期被 uniqueSignature 拦截而调用失败 (revert)
    //     let threw = false;
    //     try {
    //         const tx2 = await privacyERC20_user1.approveWithPermit(permit);
    //         await tx2.wait();
    //     } catch (e) {
    //         threw = true;
    //     }
    //     expect(threw).to.be.true;
    // });

    it("用户主动 increaseNonce 后，旧 nonce 签名的交易应失败，新 nonce 的应成功", async function () {

        // 1. 获取当前最新 nonce
        const user0Address = user0_address;
        const currentNonce = await privacyERC20.nonces(user0Address);

        // 2. 使用当前 nonce 签发一笔转账 permit
        const permit = await createEIP712Permit(
            user0,
            user1_virtural_address,
            transferAmount,
            PermitType.Transfer,
            privacyERC20_address,
            chainId,
            currentNonce
        );

        // 3. 用户 A 主动调用 increaseNonce 作废全部旧签名
        console.log(`[Nonce 撤销测试] 当前 Nonce 为: ${currentNonce}，正在递增以废弃旧签名...`);
        const cancelTx = await privacyERC20_user0.increaseNonce();
        await cancelTx.wait();
        await sleep(5000);

        const newNonce = await privacyERC20.nonces(user0Address);
        expect(newNonce).to.equal(currentNonce + 1n);

        // 4. 提交刚才签发的旧 nonce 签名交易，预期失败 (revert)
        let threwFail = false;
        try {
            const txFail = await privacyERC20_user1.transferWithPermit(permit);
            await txFail.wait();
        } catch (e) {
            threwFail = true;
        }
        expect(threwFail).to.be.true;
        console.log(`[Nonce 撤销测试] 旧签名拦截成功！调用已失败`);

        // 5. 重新以最新的 newNonce 签署交易，预期执行成功
        const newPermit = await createEIP712Permit(
            user0,
            user1_virtural_address,
            transferAmount,
            PermitType.Transfer,
            privacyERC20_address,
            chainId,
            newNonce
        );

        const tx = await privacyERC20_user1.transferWithPermit(newPermit);
        await tx.wait();
        console.log(`[Nonce 撤销测试] 新 nonce 签名交易执行成功`);
    });
});
