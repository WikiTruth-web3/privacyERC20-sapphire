/**
 * 合约相关枚举和基本类型定义
 */
import { CallFunctionParams } from "./call-params";


export enum Status {
    Storing = 0,
    Selling = 1,
    Auctioning = 2,
    Paid = 3,
    Refunding = 4,
    Delaying = 5,
    Published = 6,
    Blacklisted = 7
}

export enum RewardType {
    Minter = 0,
    Seller = 1,
    Completer = 2,
    Total = 3
}

export enum FundsType {
    Order = 0,
    Refund = 1
}

// =====================================================================================
// AddressManager
// =====================================================================================

export interface IAddressManagerRead {
    admin(): Promise<string>;
    dao(): Promise<string>;
    governance(): Promise<string>;
    daoFundManager(): Promise<string>;
    blindBox(): Promise<string>;
    exchange(): Promise<string>;
    fundManager(): Promise<string>;
    userManager(): Promise<string>;
    siweAuth(): Promise<string>;
    forwarder(): Promise<string>;
    swapContracts(): Promise<string[]>;
    isProjectContract(contract_: string): Promise<boolean>;
    settlementToken(): Promise<string>;
    isTokenSupported(token_: string): Promise<boolean>;
    getTokenList(): Promise<string[]>;
    reservedList(): Promise<string[]>;
    getAddressFromIndex(index_: number | bigint | string): Promise<string>;
}

export interface IAddressManagerWrite {
    setAddressList(list_: string[]): Promise<any>;
    setSwapContracts(list_: string[]): Promise<any>;
    setAllAddress(): Promise<any>;
    addReservedAddress(reservedAddress_: string): Promise<any>;
    setSettlementToken(token_: string): Promise<any>;
    addToken(token_: string): Promise<any>;
    removeToken(token_: string): Promise<any>;
}

// =====================================================================================
// UserManager
// =====================================================================================

export interface IUserManagerRead {
    myUserId(siweToken_: string | Uint8Array): Promise<string>;
    isBlacklisted(user_: string): Promise<boolean>;
    // getUserId(user_: string): Promise<string>; // onlyProjectContract
}

export interface IUserManagerWrite {
    setAddress(): Promise<any>;
    addBlacklist(user_: string): Promise<any>;
    removeBlacklist(user_: string): Promise<any>;
}

// =====================================================================================
// BlindBox
// =====================================================================================

export interface IBlindBoxRead {
    getStatus(boxId_: bigint | string): Promise<number>;
    getPrice(boxId_: bigint | string): Promise<bigint>;
    getDeadline(boxId_: bigint | string): Promise<bigint>;
    getBasicData(boxId_: bigint | string): Promise<[number, bigint, bigint]>;
    getSecretData(boxId_: bigint | string, siweToken_: string | Uint8Array): Promise<string>;
    isInBlacklist(boxId_: bigint | string): Promise<boolean>;
}

export interface IBlindBoxWrite {
    setAddress(): Promise<any>;
    create(tokenCID_: string, boxInfoCID_: string, key_: string | Uint8Array, price_: bigint | string): Promise<any>;
    createAndPublish(tokenCID_: string, boxInfoCID_: string): Promise<any>;
    // setStatus(boxId_: bigint | string, status_: number): Promise<any>; // onlyProjectContract
    // setPrice(boxId_: bigint | string, price_: bigint | string): Promise<any>; // onlyProjectContract
    // addDeadline(boxId_: bigint | string, seconds_: bigint | string): Promise<any>; // onlyProjectContract
    // setBasicData(boxId_: bigint | string, price_: bigint | string, status_: number, deadline_: bigint | string): Promise<any>; // onlyProjectContract
    publishByMinter(boxId_: bigint | string): Promise<any>;
    publishByBuyer(boxId_: bigint | string): Promise<any>;
    extendDeadline(boxId_: bigint | string, time_: bigint | string): Promise<any>;
    delay(boxId_: bigint | string): Promise<any>;
    addToBlacklist(boxId_: bigint | string): Promise<any>;
}

// =====================================================================================
// Exchange
// =====================================================================================

export interface IExchangeRead {
    calcPayMoney(boxId_: bigint | string, siweToken_: string | Uint8Array): Promise<bigint>;
    acceptedToken(boxId_: bigint | string): Promise<string>;
    refundPermit(boxId_: bigint | string): Promise<boolean>;
    refundRequestDeadline(boxId_: bigint | string): Promise<bigint>;
    refundReviewDeadline(boxId_: bigint | string): Promise<bigint>;
    isInRequestRefundDeadline(boxId_: bigint | string): Promise<boolean>;
    isInReviewDeadline(boxId_: bigint | string): Promise<boolean>;
}

export interface IExchangeWrite {
    setAddress(): Promise<any>;
    sell(boxId_: bigint | string, acceptedToken_: string, price_: bigint | string): Promise<any>;
    auction(boxId_: bigint | string, acceptedToken_: string, price_: bigint | string): Promise<any>;
    buy(boxId_: bigint | string): Promise<any>;
    bid(boxId_: bigint | string): Promise<any>;
    // setRefundPermit(boxId_: bigint | string, permission_: boolean): Promise<any>; // onlyProjectContract
    requestRefund(boxId_: bigint | string): Promise<any>;
    cancelRefund(boxId_: bigint | string): Promise<any>;
    agreeRefund(boxId_: bigint | string): Promise<any>;
    refuseRefund(boxId_: bigint | string): Promise<any>;
    completeOrder(boxId_: bigint | string): Promise<any>;
}

// =====================================================================================
// FundManager
// =====================================================================================

export interface IFundManagerRead {
    orderAmounts(boxId_: bigint | string, siweToken_: string | Uint8Array): Promise<bigint>;
    rewardAmounts(token_: string, siweToken_: string | Uint8Array): Promise<bigint>;
}

export interface IFundManagerWrite {
    setAddress(): Promise<any>;
    // payOrderAmount(boxId_: bigint | string, buyer_: string, amount_: bigint | string, userId_: string): Promise<any>; // onlyProjectContract
    // payDelayFee(boxId_: bigint | string, buyer_: string, amount_: bigint | string): Promise<any>; // onlyProjectContract
    // allocationRewards(boxId_: bigint | string): Promise<any>; // onlyProjectContract
    withdrawOrderAmounts(token_: string, list_: (bigint | string)[]): Promise<any>;
    withdrawRefundAmounts(token_: string, list_: (bigint | string)[]): Promise<any>;
    withdrawRewards(token_: string): Promise<any>;
}

// =====================================================================================
// Forwarder
// =====================================================================================

export interface IForwarderRead {
    isTargetWhitelisted(target_: string): Promise<boolean>;
    getMaxGasLimit(): Promise<bigint>;
}

export interface IForwarderWrite {
    setAddress(): Promise<any>;
    setTargetStatus(target_: string, status_: boolean): Promise<any>;
    setMaxGasLimit(maxGasLimit_: bigint | string): Promise<any>;
}

// =====================================================================================
// SiweAuth
// =====================================================================================

export interface ISiweAuthRead {
    domain(): Promise<string>;
    allDomains(): Promise<string>;
    domainCount(): Promise<bigint>;
    domainByIndex(index: number): Promise<string>;
    isSessionValid(token: string): Promise<boolean>;
    isDomainValid(domainName: string): Promise<string>;
    getMsgSender(token_: string | Uint8Array): Promise<string>;
    getStatement(token_: string | Uint8Array): Promise<string>;
    getResources(token_: string | Uint8Array): Promise<string[]>;
    testStatementVerification(token_: string | Uint8Array, expectedStatement_: string): Promise<boolean>;
    testHasResourceAccess(token_: string | Uint8Array, resource_: string): Promise<boolean>;
}

export interface ISiweAuthWrite {
    setPrimaryDomain(domainName: string): Promise<any>;
    setAdmin(address: string): Promise<any>;
    addDomain(domainName: string): Promise<any>;
    removeDomain(domainName: string): Promise<any>;
    removeAuthToken(token_: string | Uint8Array): Promise<any>;
}

// =====================================================================================
// 合约名称与接口映射
// =====================================================================================

export interface ContractInterfaces {
    AddressManager: { read: IAddressManagerRead, write: IAddressManagerWrite };
    UserManager: { read: IUserManagerRead, write: IUserManagerWrite };
    BlindBox: { read: IBlindBoxRead, write: IBlindBoxWrite };
    Exchange: { read: IExchangeRead, write: IExchangeWrite };
    FundManager: { read: IFundManagerRead, write: IFundManagerWrite };
    Forwarder: { read: IForwarderRead, write: IForwarderWrite };
    SiweAuth: { read: ISiweAuthRead, write: ISiweAuthWrite };
}

/**
 * 任务映射表约束
 */
export type TaskMap<T> = {
    [K in keyof T]?: CallFunctionParams<T, K>;
};


