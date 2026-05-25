import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../utils/erc20_address";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { createEIP712Permit, PermitType } from "../utils/privacyUtils";

// 辅助等待函数，防止 Sapphire 测试网因连续发送交易导致过载
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrivacyWROSE - 虚拟地址基础 ERC20 功能测试", function () {
    // 增加超时时间以适配测试网交易确认
    this.timeout(240000);

    let admin: any;
    let user1: any;
    let user2: any;
    let underlyingToken: any;
    let privacyToken: any;
    let chainId: number;

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
            admin = signers.erc20_deployer_Signer;
            user1 = signers.erc20_deployer_Signer;
            user2 = signers.erc20_user_01_Signer;
            console.log(`使用 Sapphire 测试网账户进行测试`);
        } else {
            const localSigners = await ethers.getSigners();
            admin = localSigners[0];
            user1 = localSigners[0];
            user2 = localSigners[1];
            console.log(`使用本地 Hardhat 账户进行测试`);
        }

        // 连接已部署合约
        underlyingToken = await ethers.getContractAt("contracts/WrappedROSE.sol:WrappedROSE", erc20_address_testnet.wROSE);
        privacyToken = await ethers.getContractAt("contracts/PrivacyWROSE.sol:PrivacyWROSE", erc20_address_testnet.PrivacyWROSE);

        // 确保 user1 有足够的 wROSE 余额，如果没有则存入少量
        const bal1 = await underlyingToken.balanceOf(await user1.getAddress());
        if (bal1 < ethers.parseEther("2.0")) {
            console.log("正在为 user1 充值少量 native ROSE 转换为 wROSE...");
            const tx = await underlyingToken.connect(user1).deposit({ value: ethers.parseEther("5.0") });
            await tx.wait();
            await sleep(5000);
        }

        // 确保 user2 有足够的 wROSE 余额
        const bal2 = await underlyingToken.balanceOf(await user2.getAddress());
        if (bal2 < ethers.parseEther("2.0")) {
            console.log("正在为 user2 充值少量 native ROSE 转换为 wROSE...");
            const tx = await underlyingToken.connect(user2).deposit({ value: ethers.parseEther("5.0") });
            await tx.wait();
            await sleep(5000);
        }

        // 授权 privacyToken 可以花费 user1 的 wROSE
        const allowance1 = await underlyingToken.allowance(await user1.getAddress(), await privacyToken.getAddress());
        if (allowance1 < ethers.parseEther("10.0")) {
            console.log("正在授权 PrivacyWROSE 花费 user1 的 wROSE...");
            const tx = await underlyingToken.connect(user1).approve(await privacyToken.getAddress(), ethers.MaxUint256);
            await tx.wait();
            await sleep(5000);
        }

        // 授权 privacyToken 可以花费 user2 的 wROSE
        const allowance2 = await underlyingToken.allowance(await user2.getAddress(), await privacyToken.getAddress());
        if (allowance2 < ethers.parseEther("10.0")) {
            console.log("正在授权 PrivacyWROSE 花费 user2 的 wROSE...");
            const tx = await underlyingToken.connect(user2).approve(await privacyToken.getAddress(), ethers.MaxUint256);
            await tx.wait();
            await sleep(5000);
        }
    });

    it("应当可以将 wROSE 包装（wrap）为加密的隐私余额", async function () {
        const user1Address = await user1.getAddress();
        
        // 构造查看余额签名以验证变化
        const viewPermit = await createEIP712Permit(
            user1,
            ethers.ZeroAddress,
            0,
            PermitType.VirtualAddress,
            await privacyToken.getAddress(),
            chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(viewPermit);

        // 使用 VIEW 签名去查看余额
        const balancePermit = await createEIP712Permit(
            user1,
            virtualAddr1,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(balancePermit);

        // 执行 wrap 操作
        const wrapTx = await privacyToken.connect(user1).wrap(wrapAmount);
        await wrapTx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(balancePermit);
        expect(balAfter - balBefore).to.equal(wrapAmount);
    });

    it("应当可以将隐私代币解包（unwrap）退回 wROSE 余额", async function () {
        const user1Address = await user1.getAddress();
        const viewPermit = await createEIP712Permit(
            user1,
            ethers.ZeroAddress,
            0,
            PermitType.VirtualAddress,
            await privacyToken.getAddress(),
            chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(viewPermit);

        const balancePermit = await createEIP712Permit(
            user1,
            virtualAddr1,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(balancePermit);

        // 解包退回一半 wrap 的代币
        const unwrapAmount = wrapAmount / 2n;
        const unwrapTx = await privacyToken.connect(user1).unwrap(unwrapAmount);
        await unwrapTx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(balancePermit);
        expect(balBefore - balAfter).to.equal(unwrapAmount);
    });

    it("应当支持直接存款（deposit） native ROSE 并获得隐私代币余额", async function () {
        const user1Address = await user1.getAddress();
        const viewPermit = await createEIP712Permit(
            user1,
            ethers.ZeroAddress,
            0,
            PermitType.VirtualAddress,
            await privacyToken.getAddress(),
            chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(viewPermit);

        const balancePermit = await createEIP712Permit(
            user1,
            virtualAddr1,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(balancePermit);
        const depAmount = ethers.parseEther("0.1"); // 存入 0.1 ROSE

        const tx = await privacyToken.connect(user1).deposit({ value: depAmount });
        await tx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(balancePermit);
        expect(balAfter - balBefore).to.equal(depAmount);
    });

    it("应当支持直接提款（withdraw） native ROSE", async function () {
        const user1Address = await user1.getAddress();
        const viewPermit = await createEIP712Permit(
            user1,
            ethers.ZeroAddress,
            0,
            PermitType.VirtualAddress,
            await privacyToken.getAddress(),
            chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(viewPermit);

        const balancePermit = await createEIP712Permit(
            user1,
            virtualAddr1,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(balancePermit);
        const wdrAmount = ethers.parseEther("0.05"); // 提取 0.05 ROSE

        const tx = await privacyToken.connect(user1).withdraw(wdrAmount);
        await tx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(balancePermit);
        expect(balBefore - balAfter).to.equal(wdrAmount);
    });

    it("当非拥有者（EOA）尝试公开调用 balanceOf 时应当返回 0 以保护隐私", async function () {
        const user1Address = await user1.getAddress();
        const balance = await privacyToken.connect(user2).balanceOf(user1Address);
        expect(balance).to.equal(0);
    });

    it("应当允许公开查询智能合约的隐私代币余额", async function () {
        const contractAddr = await underlyingToken.getAddress();
        
        // 公开查询 wROSE 合约在隐私代币合约里的隐私代币余额
        const initialContractBalance = await privacyToken.connect(user2).balanceOf(contractAddr);

        // 向 wROSE 合约的虚拟地址转入代币
        const transferTx = await privacyToken.connect(user1).transfer(contractAddr, transferAmount);
        await transferTx.wait();
        await sleep(5000);

        const contractBalance = await privacyToken.connect(user2).balanceOf(contractAddr);
        expect(contractBalance - initialContractBalance).to.equal(transferAmount);
    });

    it("应当支持直接转账（transfer）代币至另一个用户的虚拟地址，并可通过 Permit 验证余额", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // 获取双方的虚拟地址
        const permit1 = await createEIP712Permit(
            user1, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(permit1);

        const permit2 = await createEIP712Permit(
            user2, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(permit2);

        // 构造 VIEW 余额查询 Permit
        const viewPermit1 = await createEIP712Permit(
            user1, virtualAddr1, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const viewPermit2 = await createEIP712Permit(
            user2, virtualAddr2, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );

        const bal1Before = await privacyToken.balanceOfWithPermit(viewPermit1);
        const bal2Before = await privacyToken.balanceOfWithPermit(viewPermit2);

        // user1 直接向 user2 的虚拟地址（virtualAddr2）转账
        const tx = await privacyToken.connect(user1).transfer(virtualAddr2, transferAmount);
        await tx.wait();
        await sleep(5000);

        const bal1After = await privacyToken.balanceOfWithPermit(viewPermit1);
        const bal2After = await privacyToken.balanceOfWithPermit(viewPermit2);

        expect(bal1Before - bal1After).to.equal(transferAmount);
        expect(bal2After - bal2Before).to.equal(transferAmount);
    });

    it("应当支持对虚拟隐私地址进行授权（approve）并成功执行代扣转账（transferFrom）", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // 获取双方的虚拟隐私地址
        const permit1 = await createEIP712Permit(
            user1, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(permit1);

        const permit2 = await createEIP712Permit(
            user2, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(permit2);

        // user1 授权给 user2 的虚拟隐私地址（virtualAddr2）可代扣额度
        const appTx = await privacyToken.connect(user1).approve(virtualAddr2, transferAmount);
        await appTx.wait();
        await sleep(5000);

        // user2 构造余额与额度查询
        const viewPermitForAllowance = await createEIP712Permit(
            user1, virtualAddr2, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const allowance = await privacyToken.connect(user2).allowanceWithPermit(viewPermitForAllowance);
        expect(allowance).to.equal(transferAmount);

        // 记录划转前余额
        const viewPermit1 = await createEIP712Permit(
            user1, virtualAddr1, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const viewPermit2 = await createEIP712Permit(
            user2, virtualAddr2, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );

        const bal1Before = await privacyToken.balanceOfWithPermit(viewPermit1);
        const bal2Before = await privacyToken.balanceOfWithPermit(viewPermit2);

        // user2 调用 transferFrom，从 user1 的虚拟地址转到 user2 自己的虚拟地址上
        const tfTx = await privacyToken.connect(user2).transferFrom(virtualAddr1, virtualAddr2, transferAmount);
        await tfTx.wait();
        await sleep(5000);

        const bal1After = await privacyToken.balanceOfWithPermit(viewPermit1);
        const bal2After = await privacyToken.balanceOfWithPermit(viewPermit2);

        expect(bal1Before - bal1After).to.equal(transferAmount);
        expect(bal2After - bal2Before).to.equal(transferAmount);
    });
});
