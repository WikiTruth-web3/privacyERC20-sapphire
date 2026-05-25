import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../utils/erc20_address";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { createEIP712Permit, PermitType } from "../utils/privacyUtils";

// 辅助等待函数，防止 Sapphire 测试网因连续发送交易导致过载
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrivacyWROSE - EIP712 签名授权 (Permit) 功能测试", function () {
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
    const transferAmount = ethers.parseEther("0.02"); // 划转 0.02 wROSE

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

        // 确保 user1 有足够的 wROSE 余额
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

        // 确保 user1 拥有足够的加密隐私余额以进行后续测试
        const permit1 = await createEIP712Permit(
            user1, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(permit1);

        const viewPermit = await createEIP712Permit(
            user1, virtualAddr1, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const pBal = await privacyToken.balanceOfWithPermit(viewPermit);
        if (pBal < ethers.parseEther("0.5")) {
            console.log("正在将 user1 的 wROSE 注入隐私余额中...");
            const tx = await privacyToken.connect(user1).wrap(ethers.parseEther("1.0"));
            await tx.wait();
            await sleep(5000);
        }
    });

    it("应当能够使用 EIP-712 签名 (VIEW) 查询普通 EOA 的加密余额", async function () {
        const permit1 = await createEIP712Permit(
            user1, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(permit1);

        const viewPermit = await createEIP712Permit(
            user1,
            virtualAddr1,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );

        const balance = await privacyToken.connect(user2).balanceOfWithPermit(viewPermit);
        expect(balance).to.be.greaterThanOrEqual(0n);
    });

    it("应当能够使用 EIP-712 签名 (VIEW) 查询对虚拟 spender 地址的授权额度", async function () {
        // 获取 user2 的虚拟隐私地址
        const permit2 = await createEIP712Permit(
            user2, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(permit2);

        const viewPermit = await createEIP712Permit(
            user1,
            virtualAddr2,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );

        const allowance = await privacyToken.connect(user2).allowanceWithPermit(viewPermit);
        expect(allowance).to.be.greaterThanOrEqual(0n);
    });

    it("应当允许使用带有接收方虚拟地址的 transferWithPermit 签名进行转账", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // 获取双方虚拟隐私地址
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

        // 创建 transfer 签名（user1 签名，授权将 transferAmount 划转给 user2 的虚拟地址）
        // 这里的 spender 参数直接填入接收方的虚拟地址（即 virtualAddr2）
        const permit = await createEIP712Permit(
            user1,
            virtualAddr2,
            transferAmount,
            PermitType.Transfer,
            await privacyToken.getAddress(),
            chainId
        );

        // 任何人都可以递交此签名（此处由 user2 发送）来执行转账
        const tx = await privacyToken.connect(user2).transferWithPermit(permit);
        await tx.wait();
        await sleep(5000);

        const bal1After = await privacyToken.balanceOfWithPermit(viewPermit1);
        const bal2After = await privacyToken.balanceOfWithPermit(viewPermit2);

        expect(bal1Before - bal1After).to.equal(transferAmount);
        expect(bal2After - bal2Before).to.equal(transferAmount);
    });

    it("应当允许使用带有 spender 虚拟地址的 approveWithPermit 签名进行额度授权", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // 获取被授权方的虚拟隐私地址
        const permit2 = await createEIP712Permit(
            user2, ethers.ZeroAddress, 0, PermitType.VirtualAddress, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(permit2);

        // 创建 approve 签名（user1 签名，授权额度给被授权方的虚拟隐私地址 virtualAddr2）
        const permit = await createEIP712Permit(
            user1,
            virtualAddr2,
            transferAmount,
            PermitType.Approve,
            await privacyToken.getAddress(),
            chainId
        );

        // 执行 approveWithPermit
        const tx = await privacyToken.connect(user2).approveWithPermit(permit);
        await tx.wait();
        await sleep(5000);

        // 查询授权额度
        const viewPermitForAllowance = await createEIP712Permit(
            user1,
            virtualAddr2,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );
        const allowance = await privacyToken.connect(user2).allowanceWithPermit(viewPermitForAllowance);
        expect(allowance).to.equal(transferAmount);
    });
});
