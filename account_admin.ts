export const user_evm = {
    admin: {
        address: process.env.ADMIN_ADDR_EVM,
        privateKey: process.env.ADMIN_PRIVATE_KEY_EVM,
    },
    minter: {
        address: process.env.MINTER_ADDR_EVM,
        privateKey: process.env.MINTER_PRIVATE_KEY_EVM,
    },
    buyer: {
        address: process.env.BUYER_ADDR_EVM,
        privateKey: process.env.BUYER_PRIVATE_KEY_EVM,
    },
    buyer2: {
        address: process.env.BUYER2_ADDR_EVM,
        privateKey: process.env.BUYER2_PRIVATE_KEY_EVM,
    },
    daoFundManager: {
        address: process.env.DAO_FUND_MANAGER_ADDR_EVM,
        privateKey: process.env.DAO_FUND_MANAGER_PRIVATE_KEY_EVM,
    }
}

export const user_oasis = {
    admin: {
        address: process.env.ADMIN_ADDR_OASIS_CONSENSUS,
        privateKey: process.env.ADMIN_PRIVATE_KEY_OASIS_CONSENSUS,
    },
    minter: {
        address: process.env.MINTER_ADDR_OASIS_CONSENSUS,
        privateKey: process.env.MINTER_PRIVATE_KEY_OASIS_CONSENSUS,
    },
    buyer: {
        address: process.env.BUYER_ADDR_OASIS_CONSENSUS,
        privateKey: process.env.BUYER_PRIVATE_KEY_OASIS_CONSENSUS,
    },
    buyer2: {
        address: process.env.BUYER2_ADDR_OASIS_CONSENSUS,
        privateKey: process.env.BUYER2_PRIVATE_KEY_OASIS_CONSENSUS,
    },
    daoFundManager: {
        address: process.env.DAO_FUND_MANAGER_ADDR_OASIS_CONSENSUS,
        privateKey: process.env.DAO_FUND_MANAGER_PRIVATE_KEY_OASIS_CONSENSUS,
    }
}

















