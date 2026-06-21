// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BigMedalToken is ERC20Capped, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 public constant MAX_SUPPLY = 10_000_000 ether;
    uint256 public constant JST_OFFSET = 9 hours;

    mapping(address account => bool enabled) public minters;
    mapping(address account => uint256 dayNumber) public lastLoginBonusDay;

    bool public loginBonusEnabled = true;
    uint256 public loginBonusAmount = 1 ether;
    uint256 public loginBonusMinBalance = 1 ether;

    error UnauthorizedMinter(address account);
    error LoginBonusDisabled();
    error LoginBonusAlreadyClaimed(uint256 dayNumber);
    error LoginBonusInsufficientBalance(uint256 balance, uint256 requiredBalance);

    event MinterUpdated(address indexed account, bool enabled);
    event LoginBonusEnabledUpdated(bool enabled);
    event LoginBonusAmountUpdated(uint256 amount);
    event LoginBonusMinBalanceUpdated(uint256 amount);
    event LoginBonusClaimed(address indexed account, uint256 indexed dayNumber, uint256 amount);

    constructor(address initialOwner)
        ERC20("Big Medal Token", "BMT")
        ERC20Capped(MAX_SUPPLY)
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != owner() && !minters[msg.sender]) {
            revert UnauthorizedMinter(msg.sender);
        }

        _mint(to, amount);
    }

    function claimLoginBonus() external {
        if (!loginBonusEnabled) {
            revert LoginBonusDisabled();
        }

        uint256 balanceBeforeClaim = balanceOf(msg.sender);
        if (balanceBeforeClaim < loginBonusMinBalance) {
            revert LoginBonusInsufficientBalance(balanceBeforeClaim, loginBonusMinBalance);
        }

        uint256 dayNumber = currentJstDay();
        if (lastLoginBonusDay[msg.sender] == dayNumber) {
            revert LoginBonusAlreadyClaimed(dayNumber);
        }

        lastLoginBonusDay[msg.sender] = dayNumber;
        _mint(msg.sender, loginBonusAmount);
        emit LoginBonusClaimed(msg.sender, dayNumber, loginBonusAmount);
    }

    function canClaimLoginBonus(address account) external view returns (bool) {
        return loginBonusEnabled
            && balanceOf(account) >= loginBonusMinBalance
            && lastLoginBonusDay[account] != currentJstDay()
            && totalSupply() + loginBonusAmount <= cap();
    }

    function setMinter(address account, bool enabled) external onlyOwner {
        minters[account] = enabled;
        emit MinterUpdated(account, enabled);
    }

    function setLoginBonusEnabled(bool enabled) external onlyOwner {
        loginBonusEnabled = enabled;
        emit LoginBonusEnabledUpdated(enabled);
    }

    function setLoginBonusAmount(uint256 amount) external onlyOwner {
        loginBonusAmount = amount;
        emit LoginBonusAmountUpdated(amount);
    }

    function setLoginBonusMinBalance(uint256 amount) external onlyOwner {
        loginBonusMinBalance = amount;
        emit LoginBonusMinBalanceUpdated(amount);
    }

    function currentJstDay() public view returns (uint256) {
        return (block.timestamp + JST_OFFSET) / 1 days;
    }
}
