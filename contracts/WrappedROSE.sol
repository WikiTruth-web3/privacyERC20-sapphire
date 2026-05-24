// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WrappedROSE is ERC20 {
    // Custom error
    error MintPeriodNotOver();

    // State variables for mint control
    mapping(address => uint256) public mintDate;
    uint256 public constant mintPeriod = 1 days;
    uint256 public constant mintAmount = 1000;

    // Events for deposit and withdraw
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {}

    /**
     * @dev Deposit native ROSE token to wrap it as wROSE
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw native ROSE token by burning wROSE
     */
    function withdraw(uint256 amount_) public {
        _burn(msg.sender, amount_);
        payable(msg.sender).transfer(amount_);
        emit Withdrawal(msg.sender, amount_);
    }

    /**
     * @dev Fallback to receive native ROSE
     */
    receive() external payable {
        deposit();
    }

    function mint(address to_) public {
        if (block.timestamp - mintDate[to_] < mintPeriod)
            revert MintPeriodNotOver();
        _mint(to_, mintAmount * (10 ** decimals()));
        mintDate[to_] = block.timestamp;
    }

    function burn(uint256 amount_) public {
        address from = _msgSender();
        _burn(from, amount_);
    }
}
