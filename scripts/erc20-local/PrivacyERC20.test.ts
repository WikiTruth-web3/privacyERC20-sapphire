import { expect } from "chai";
import { ethers } from "hardhat";
import { getAccount } from "../../utils";
import {
    createEIP712Permit,
    createGetUserIdSignature,
    PermitType
} from "../utils/privacyUtils";

describe("PrivacyERC20WithUserId- 相关测试", function () {
    let admin: any;
    let user1: any;
    let user2: any;
    let mockToken: any;
    let privacyToken: any;
    let chainId: number;

    const wrapAmount = ethers.parseEther("100");
    const transferAmount = ethers.parseEther("30");

    before(async function () {
        this.timeout(60000);
        const network = await ethers.provider.getNetwork();
        chainId = Number(network.chainId);
        console.log(`🌐 Testing on Network: ${network.name || "Hardhat"}, Chain ID: ${chainId}`);

        // Get test accounts
        const accounts = await getAccount(chainId);
        admin = accounts.admin;
        user1 = accounts.buyer;
        user2 = accounts.buyer2;

        // Deploy Mock ERC20
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20Factory.deploy("Mock Token", "MOCK");
        await mockToken.waitForDeployment();
        console.log(`MockERC20 deployed at: ${await mockToken.getAddress()}`);

        // Deploy PrivacyERC20WithUserId
        const PrivacyERC20WithUserIdFactory = await ethers.getContractFactory("PrivacyERC20WithUserId");
        privacyToken = await PrivacyERC20WithUserIdFactory.deploy(
            await mockToken.getAddress(),
            ethers.toUtf8Bytes("test_salt_generation")
        );
        await privacyToken.waitForDeployment();
        console.log(`PrivacyERC20WithUserId deployed at: ${await privacyToken.getAddress()}`);

        // Distribute mock tokens
        await mockToken.connect(admin).mint(await user1.getAddress());
        await mockToken.connect(admin).mint(await user2.getAddress());
        
        // Approve privacyToken to spend mock tokens
        await mockToken.connect(user1).approve(await privacyToken.getAddress(), ethers.MaxUint256);
        await mockToken.connect(user2).approve(await privacyToken.getAddress(), ethers.MaxUint256);
    });

    describe("userId Generation & Retrieval", function () {
        it("Should revert getMyUserId if signature is invalid or expired", async function () {
            const user1Address = await user1.getAddress();
            const badSig = {
                r: ethers.ZeroHash,
                s: ethers.ZeroHash,
                v: 27
            };
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            await expect(
                privacyToken.getMyUserId(user1Address, deadline, badSig)
            ).to.be.revertedWithCustomError(privacyToken, "EIPError");
        });

        it("Should securely retrieve EOA's own userId with valid signature", async function () {
            const user1Address = await user1.getAddress();
            const { signature, deadline } = await createGetUserIdSignature(
                user1,
                await privacyToken.getAddress(),
                chainId
            );

            const userId = await privacyToken.getMyUserId(user1Address, deadline, signature);
            expect(userId).to.not.equal(ethers.ZeroHash);
            console.log(`User1 userId: ${userId}`);
        });

        it("Should allow public retrieval of contract's userId", async function () {
            const contractAddr = await mockToken.getAddress();
            const contractUserId = await privacyToken.getContractUserId(contractAddr);
            expect(contractUserId).to.not.equal(ethers.ZeroHash);
            console.log(`MockERC20 Contract userId: ${contractUserId}`);
        });

        it("Should revert getContractUserId for EOA addresses", async function () {
            const user1Address = await user1.getAddress();
            await expect(
                privacyToken.getContractUserId(user1Address)
            ).to.be.revertedWithCustomError(privacyToken, "NotContractAddress");
        });
    });

    describe("Wrap & Unwrap Operations", function () {
        it("Should wrap mock tokens into encrypted privacy balance", async function () {
            const user1Address = await user1.getAddress();
            const wrapTx = await privacyToken.connect(user1).wrap(wrapAmount);
            const receipt = await wrapTx.wait();

            // Verify no events are emitted
            expect(receipt.logs.length).to.equal(0);

            // Verify balance via balanceOf (when msg.sender is owner)
            const balance = await privacyToken.connect(user1).balanceOf(user1Address);
            expect(balance).to.equal(wrapAmount);
        });

        it("Should unwrap privacy tokens back to mock tokens", async function () {
            const user1Address = await user1.getAddress();
            const unwrapTx = await privacyToken.connect(user1).unwrap(wrapAmount / 2n);
            const receipt = await unwrapTx.wait();

            // Verify no events are emitted
            expect(receipt.logs.length).to.equal(0);

            // Verify balance is decreased
            const balance = await privacyToken.connect(user1).balanceOf(user1Address);
            expect(balance).to.equal(wrapAmount / 2n);
        });
    });

    describe("Balance & Allowance Queries (Privacy Rules)", function () {
        it("Should return 0 for balanceOf if caller is not the owner (EOA)", async function () {
            const user1Address = await user1.getAddress();
            // User2 queries User1's balance directly
            const balance = await privacyToken.connect(user2).balanceOf(user1Address);
            expect(balance).to.equal(0);
        });

        it("Should return balance of contract address for public queries", async function () {
            const contractAddr = await mockToken.getAddress();
            
            // Wrap some tokens and transfer to contractAddress
            await privacyToken.connect(user1).wrap(wrapAmount);
            await privacyToken.connect(user1).transfer(contractAddr, transferAmount);

            // Anyone (User2) should be able to query the contract's balance
            const contractBalance = await privacyToken.connect(user2).balanceOf(contractAddr);
            expect(contractBalance).to.equal(transferAmount);
        });

        it("Should retrieve EOA's balance using EIP-712 Permit", async function () {
            const user1Address = await user1.getAddress();
            const permit = await createEIP712Permit(
                user1,
                await user2.getAddress(),
                0,
                PermitType.View,
                await privacyToken.getAddress(),
                chainId
            );

            // View via permit should succeed
            const balance = await privacyToken.connect(user2).balanceOfWithPermit(permit);
            // Current expected balance:
            // Initial wrap: 100
            // Unwrap: 50 (leaves 50)
            // Second wrap: 100 (leaves 150)
            // Transfer to contract: 30 (leaves 120)
            expect(balance).to.equal(ethers.parseEther("120"));
        });
    });

    describe("Transfer & Allowance with userId", function () {
        it("Should transfer tokens between accounts and check balances via permit", async function () {
            const user1Address = await user1.getAddress();
            const user2Address = await user2.getAddress();

            // Get initial balances
            const user1ViewPermit = await createEIP712Permit(
                user1, user2Address, 0, PermitType.View, await privacyToken.getAddress(), chainId
            );
            const user2ViewPermit = await createEIP712Permit(
                user2, user1Address, 0, PermitType.View, await privacyToken.getAddress(), chainId
            );
            
            const bal1Before = await privacyToken.balanceOfWithPermit(user1ViewPermit);
            const bal2Before = await privacyToken.balanceOfWithPermit(user2ViewPermit);

            // Transfer from user1 to user2
            const tx = await privacyToken.connect(user1).transfer(user2Address, transferAmount);
            const receipt = await tx.wait();
            
            // Verify no events are emitted
            expect(receipt.logs.length).to.equal(0);

            // Verify updated balances
            const bal1After = await privacyToken.balanceOfWithPermit(user1ViewPermit);
            const bal2After = await privacyToken.balanceOfWithPermit(user2ViewPermit);

            expect(bal1Before - bal1After).to.equal(transferAmount);
            expect(bal2After - bal2Before).to.equal(transferAmount);
        });

        it("Should allow transferWithPermit", async function () {
            const user1Address = await user1.getAddress();
            const user2Address = await user2.getAddress();

            // Create transfer permit (User1 permits User2 to transfer transferAmount)
            const permit = await createEIP712Permit(
                user1,
                user2Address,
                transferAmount,
                PermitType.Transfer,
                await privacyToken.getAddress(),
                chainId
            );

            const user2ViewPermit = await createEIP712Permit(
                user2, user1Address, 0, PermitType.View, await privacyToken.getAddress(), chainId
            );
            const bal2Before = await privacyToken.balanceOfWithPermit(user2ViewPermit);

            // Execute transferWithPermit
            const tx = await privacyToken.connect(user2).transferWithPermit(permit);
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(0);

            const bal2After = await privacyToken.balanceOfWithPermit(user2ViewPermit);
            expect(bal2After - bal2Before).to.equal(transferAmount);
        });
    });
});
