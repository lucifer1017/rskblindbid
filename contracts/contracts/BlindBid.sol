// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error PhaseNotActive();
error AlreadyCommitted();
error InvalidDeposit();
error NothingToReveal();
error HashMismatch();
error BidExceedsDeposit();
error AuctionAlreadyEnded();
error NothingToWithdraw();
error TransferFailed();

contract BlindBid is ReentrancyGuard {
    uint256 public immutable commitEndTime;
    uint256 public immutable revealEndTime;
    address public immutable beneficiary;

    address public highestBidder;
    uint256 public highestBid;
    bool public auctionEnded;

    struct Bid {
        bytes32 blindedBid; // The locked keccak256 hash
        uint256 deposit; // The dummy rBTC sent to mask the bid
    }

    mapping(address => Bid) public bids;

    // SECURITY: The Pull Payment tracking
    mapping(address => uint256) public pendingReturns;

    // --- CONSTRUCTOR ---
    constructor(
        uint256 _commitDurationInSeconds,
        uint256 _revealDurationInSeconds,
        address _beneficiary
    ) {
        commitEndTime = block.timestamp + _commitDurationInSeconds;
        revealEndTime = commitEndTime + _revealDurationInSeconds;
        beneficiary = _beneficiary;
    }

    // --- EVENTS ---
    event BidCommitted(address indexed bidder, bytes32 blindedBid);
    event BidRevealed(address indexed bidder, uint256 amount);
    event Withdrawal(address indexed withdrawer, uint256 amount);
    event AuctionEnded(address winner, uint256 highestBid);

    // --- MODIFIERS ---
    modifier onlyBefore(uint256 time) {
        if (block.timestamp > time) revert PhaseNotActive();
        _;
    }

    modifier onlyAfter(uint256 time) {
        if (block.timestamp <= time) revert PhaseNotActive();
        _;
    }

    // --- CORE LOGIC ---
    function commit(
        bytes32 _blindedBid
    ) external payable onlyBefore(commitEndTime) {
        if (bids[msg.sender].deposit != 0) revert AlreadyCommitted();
        if (msg.value == 0) revert InvalidDeposit();

        bids[msg.sender] = Bid({blindedBid: _blindedBid, deposit: msg.value});

        emit BidCommitted(msg.sender, _blindedBid);
    }

    function reveal(
        uint256 _amount,
        string memory _secret
    ) external onlyAfter(commitEndTime) onlyBefore(revealEndTime) {
        Bid storage bidToCheck = bids[msg.sender];
        uint256 deposit = bidToCheck.deposit;

        if (deposit == 0) revert NothingToReveal();

        // 1. CHECKS: Cryptographic Validation
        bytes32 expectedHash = keccak256(abi.encodePacked(_amount, _secret));
        if (expectedHash != bidToCheck.blindedBid) revert HashMismatch();
        if (_amount > deposit) revert BidExceedsDeposit();

        // 2. EFFECTS: Clear data to prevent double-reveals
        bidToCheck.blindedBid = bytes32(0);
        bidToCheck.deposit = 0;

        uint256 refund = deposit;

        if (_amount > highestBid) {
            // Add the previous winner's funds to the withdrawal mapping
            if (highestBidder != address(0)) {
                pendingReturns[highestBidder] += highestBid;
            }

            highestBid = _amount;
            highestBidder = msg.sender;
            refund -= _amount; // Deduct their winning bid from their refund
        }

        // Add any excess deposit to the user's withdrawal balance
        if (refund > 0) {
            pendingReturns[msg.sender] += refund;
        }

        emit BidRevealed(msg.sender, _amount);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        // EFFECTS
        pendingReturns[msg.sender] = 0;

        // INTERACTIONS
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawal(msg.sender, amount);
    }

    function settleAuction() external onlyAfter(revealEndTime) nonReentrant {
        if (auctionEnded) revert AuctionAlreadyEnded();

        auctionEnded = true;
        emit AuctionEnded(highestBidder, highestBid);

        if (highestBid > 0) {
            (bool success, ) = payable(beneficiary).call{value: highestBid}("");
            if (!success) revert TransferFailed();
        }
    }
}
