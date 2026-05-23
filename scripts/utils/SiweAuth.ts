// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Signer } from 'ethers';
import { SiweMessage } from 'siwe';
import '@nomicfoundation/hardhat-chai-matchers';
// import { user_evm_WikiTruth } from "../WikiTruth_account";
// import { HardhatRuntimeEnvironment } from "hardhat/types";
// import { NETWORKS } from '@oasisprotocol/sapphire-paratime';

export async function getSiweMsg(
    domain: string,
    signer: Signer,
    chainId: number,
    expiration?: Date, // 过期时间
    statement?: string, // 
    resources?: string[], // 
): Promise<string> {
    return new SiweMessage({
        domain,
        address: await signer.getAddress(), 
        statement:
            statement ||
            `I accept the ExampleOrg Terms of Service: https://${domain}/tos`,
        uri: `https://${domain}`,
        version: '1',
        chainId: chainId,
        expirationTime: expiration ? expiration.toISOString() : undefined,
        resources: resources || [],
    }).toMessage();
}

// Signs the given message as ERC-191 "personal_sign" message.
async function erc191sign(msg: string, signer: Signer) {
    return ethers.Signature.from(await signer.signMessage(msg));
}

export async function get_siwe_token(
    domain: string, 
    signer: Signer, 
    chainId: number, 
    siweContract:any,
    expiration?: Date, 
    statement?: string, // 
    resources?: string[], // 
) {
    console.log("🎫 正在通过 SiweAuth 合约登录以生成加密 Token...");
    const siweMsg = await getSiweMsg(domain, signer, chainId, expiration, statement, resources);
    const signature = await erc191sign(siweMsg, signer);
    
    const siweAuthAddr = siweContract;
    const siweAuth = await ethers.getContractAt("SiweAuthWikiTruth", siweAuthAddr);
    
    const token = await siweAuth.login(siweMsg, {
        v: signature.v,
        r: signature.r,
        s: signature.s
    });
    console.log("✅ 加密 Token 获取成功");

    return token;
}