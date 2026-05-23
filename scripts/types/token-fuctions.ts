import { CallFunctionParams } from "./call-params";
export { TaskMap } from "./contracts-functions";

/**
 * EIP712 签名相关的结构体
 */
export interface ISignatureRSV {
    r: string;
    s: string;
    v: number | bigint;
}

export interface IEIP712Permit {
    label: number; // 0=VIEW, 1=TRANSFER, 2=APPROVE
    owner: string;
    spender: string;
    amount: bigint | string;
    deadline: number | bigint;
    signature: ISignatureRSV;
}

/**
 * 标准 ERC20 接口
 */
export interface IERC20 {
    name(): Promise<string>;
    symbol(): Promise<string>;
    decimals(): Promise<number>;
    totalSupply(): Promise<bigint>;
    balanceOf(account: string): Promise<bigint>;
    allowance(owner: string, spender: string): Promise<bigint>;
    transfer(to: string, value: bigint | string): Promise<any>;
    approve(spender: string, value: bigint | string): Promise<any>;
    transferFrom(from: string, to: string, value: bigint | string): Promise<any>;
}

/**
 * MockERC20 扩展接口
 */
export interface IMockERC20 extends IERC20 {
    mint(to_: string): Promise<any>;
    mintAdmin(): Promise<any>;
    burn(amount_: bigint | string): Promise<any>;
    setMintPeriod(period_: bigint | string): Promise<any>;
    setMintAmount(amount_: bigint | string): Promise<any>;
    mintDate(user: string): Promise<bigint>;
    mintPeriod(): Promise<bigint>;
    mintAmount(): Promise<bigint>;
}

/**
 * ERC20privacy 接口
 */
export interface IERC20privacy extends IERC20 {
    underlyingToken(): Promise<string>;
    DOMAIN_SEPARATOR(): Promise<string>;
    balanceOfWithPermit(permit: IEIP712Permit): Promise<bigint>;
    allowanceWithPermit(permit: IEIP712Permit): Promise<bigint>;
    transferWithPermit(permit: IEIP712Permit): Promise<any>;
    approveWithPermit(permit: IEIP712Permit): Promise<any>;
    wrap(amount: bigint | string): Promise<any>;
    unwrap(amount: bigint | string): Promise<any>;
    isSignatureUsed(signature: ISignatureRSV): Promise<boolean>;
}

/**
 * WROSEprivacy 接口
 */
export interface IWROSEprivacy extends IERC20privacy {
    deposit(): Promise<any>; // payable
    withdraw(amount: bigint | string): Promise<any>;
}

/**
 * Token 合约映射
 */
export interface TokenInterfaces {
    ERC20: { read: IERC20, write: IERC20 };
    MockERC20: { read: IMockERC20, write: IMockERC20 };
    ERC20privacy: { read: IERC20privacy, write: IERC20privacy };
    WROSEprivacy: { read: IWROSEprivacy, write: IWROSEprivacy };
}
