import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

import type { Address } from "viem";
import { parseEther, keccak256, encodePacked } from "viem";

describe("BlindBid Contract", async function () {
  const { viem, networkHelpers } = await network.connect();
  const publicClient = await viem.getPublicClient();

  function generateHash(amount: bigint, secret: string) {
    return keccak256(encodePacked(["uint256", "string"], [amount, secret]));
  }


  it("Should allow a user to commit a hashed bid successfully", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const trueBidAmount = parseEther("1");
    const secretPassword = "mySecretPassword";
    const dummyDeposit = parseEther("2");

    const blindedHash = generateHash(trueBidAmount, secretPassword);

    await blindBid.write.commit([blindedHash], {
      value: dummyDeposit,
      account: bidder1.account,
    });

    const storedBid = (await blindBid.read.bids([bidder1.account.address])) as [string, bigint];

    assert.equal(storedBid[0], blindedHash, "The hash was not stored correctly");
    assert.equal(storedBid[1], dummyDeposit, "The deposit was not recorded correctly");
  });

  it("Should allow revealing a bid only after the commit phase ends", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const trueBidAmount = parseEther("5");
    const secretPassword = "demoPassword";
    const dummyDeposit = parseEther("10");
    const blindedHash = generateHash(trueBidAmount, secretPassword);

    await blindBid.write.commit([blindedHash], { value: dummyDeposit, account: bidder1.account });
    await networkHelpers.time.increase(61);

    await blindBid.write.reveal([trueBidAmount, secretPassword], { account: bidder1.account });

    const currentHighestBidder = (await blindBid.read.highestBidder()) as Address;
    const currentHighestBid = await blindBid.read.highestBid();

    assert.equal(currentHighestBidder.toLowerCase(), bidder1.account.address.toLowerCase());
    assert.equal(currentHighestBid, trueBidAmount);

    const pendingRefund = await blindBid.read.pendingReturns([bidder1.account.address]);
    assert.equal(pendingRefund, parseEther("5"), "Refund was not calculated correctly");
  });

  it("Should correctly settle the auction and allow the beneficiary to get paid", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const trueBidAmount = parseEther("3");
    const secretPassword = "winnerPassword";
    const blindedHash = generateHash(trueBidAmount, secretPassword);

    await blindBid.write.commit([blindedHash], { value: parseEther("5"), account: bidder1.account });
    await networkHelpers.time.increase(61);
    await blindBid.write.reveal([trueBidAmount, secretPassword], { account: bidder1.account });
    await networkHelpers.time.increase(61);

    const balanceBefore = await publicClient.getBalance({ address: beneficiary.account.address });
    await blindBid.write.settleAuction();
    const balanceAfter = await publicClient.getBalance({ address: beneficiary.account.address });

    assert.equal(balanceAfter - balanceBefore, parseEther("3"), "Beneficiary did not receive the winning bid");

    const isEnded = await blindBid.read.auctionEnded();
    assert.equal(isEnded, true, "Auction ended flag was not set");
  });


  it("Should block commit if commit phase has ended", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const blindedHash = generateHash(parseEther("1"), "secret");

    await networkHelpers.time.increase(61);

    await assert.rejects(
      blindBid.write.commit([blindedHash], { value: parseEther("2"), account: bidder1.account }),
      (err: Error) => err.message.includes("PhaseNotActive"),
      "Contract did not revert when committing late",
    );
  });

  it("Should block commit with zero deposit (InvalidDeposit)", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const blindedHash = generateHash(parseEther("1"), "secret");

    await assert.rejects(
      blindBid.write.commit([blindedHash], { value: 0n, account: bidder1.account }),
      (err: Error) => err.message.includes("InvalidDeposit"),
      "Contract did not revert on zero deposit",
    );
  });

  it("Should block a user from committing twice", async function () {
    const [, beneficiary, spammer] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const blindedHash = generateHash(parseEther("1"), "secret");

    await blindBid.write.commit([blindedHash], { value: parseEther("2"), account: spammer.account });

    await assert.rejects(
      blindBid.write.commit([blindedHash], { value: parseEther("2"), account: spammer.account }),
      (err: Error) => err.message.includes("AlreadyCommitted"),
      "Contract allowed a wallet to commit twice",
    );
  });

  it("Should block reveal before commit phase ends (PhaseNotActive)", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const bid = parseEther("2");
    const secret = "tooEarly";
    const hash = generateHash(bid, secret);

    await blindBid.write.commit([hash], { value: parseEther("3"), account: bidder1.account });

    await assert.rejects(
      blindBid.write.reveal([bid, secret], { account: bidder1.account }),
      (err: Error) => err.message.includes("PhaseNotActive"),
      "Reveal should fail during commit phase",
    );
  });

  it("Should block reveal after reveal phase ends (PhaseNotActive)", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const bid = parseEther("2");
    const secret = "tooLate";
    const hash = generateHash(bid, secret);

    await blindBid.write.commit([hash], { value: parseEther("3"), account: bidder1.account });

    await networkHelpers.time.increase(122);

    await assert.rejects(
      blindBid.write.reveal([bid, secret], { account: bidder1.account }),
      (err: Error) => err.message.includes("PhaseNotActive"),
      "Reveal should fail after reveal phase",
    );
  });

  it("Should block reveal when user never committed (NothingToReveal)", async function () {
    const [, beneficiary, randomUser] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    await networkHelpers.time.increase(61);

    await assert.rejects(
      blindBid.write.reveal([parseEther("1"), "noCommit"], { account: randomUser.account }),
      (err: Error) => err.message.includes("NothingToReveal"),
      "Contract did not revert for non-committer reveal",
    );
  });

  it("Should block reveal if password is wrong (HashMismatch)", async function () {
    const [, beneficiary, hacker] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const trueBid = parseEther("5");
    const realPassword = "myRealPassword";
    const blindedHash = generateHash(trueBid, realPassword);

    await blindBid.write.commit([blindedHash], { value: parseEther("10"), account: hacker.account });
    await networkHelpers.time.increase(61);

    await assert.rejects(
      blindBid.write.reveal([trueBid, "wrongPassword"], { account: hacker.account }),
      (err: Error) => err.message.includes("HashMismatch"),
      "Contract did not catch wrong password",
    );
  });

  it("Should block reveal if amount is wrong (HashMismatch)", async function () {
    const [, beneficiary, hacker] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const trueBid = parseEther("5");
    const realPassword = "sameSecret";
    const blindedHash = generateHash(trueBid, realPassword);

    await blindBid.write.commit([blindedHash], { value: parseEther("10"), account: hacker.account });
    await networkHelpers.time.increase(61);

    await assert.rejects(
      blindBid.write.reveal([parseEther("6"), realPassword], { account: hacker.account }),
      (err: Error) => err.message.includes("HashMismatch"),
      "Contract did not catch wrong amount hash",
    );
  });

  it("Should block reveal when amount exceeds deposit (BidExceedsDeposit)", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const oversizedBid = parseEther("10");
    const deposit = parseEther("5");
    const secret = "oversized";
    const blindedHash = generateHash(oversizedBid, secret);

    await blindBid.write.commit([blindedHash], { value: deposit, account: bidder1.account });
    await networkHelpers.time.increase(61);

    await assert.rejects(
      blindBid.write.reveal([oversizedBid, secret], { account: bidder1.account }),
      (err: Error) => err.message.includes("BidExceedsDeposit"),
      "Contract did not revert when bid > deposit",
    );
  });

  it("Pull payment logic works when first bidder is outbid", async function () {
    const [, beneficiary, bidder1, bidder2] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    await blindBid.write.commit([generateHash(parseEther("5"), "pass1")], {
      value: parseEther("10"),
      account: bidder1.account,
    });

    await blindBid.write.commit([generateHash(parseEther("8"), "pass2")], {
      value: parseEther("10"),
      account: bidder2.account,
    });

    await networkHelpers.time.increase(61);

    await blindBid.write.reveal([parseEther("5"), "pass1"], { account: bidder1.account });
    await blindBid.write.reveal([parseEther("8"), "pass2"], { account: bidder2.account });

    const bidder1Refund = await blindBid.read.pendingReturns([bidder1.account.address]);
    assert.equal(bidder1Refund, parseEther("10"), "Refund for outbid user is incorrect");

    const balanceBefore = await publicClient.getBalance({ address: bidder1.account.address });
    await blindBid.write.withdraw( { account: bidder1.account });
    const balanceAfter = await publicClient.getBalance({ address: bidder1.account.address });

    assert.equal(balanceAfter > balanceBefore, true, "Withdrawal failed to increase bidder balance");
  });

  it("Equal bid should not replace current highest bidder (strict >)", async function () {
    const [, beneficiary, bidder1, bidder2] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    await blindBid.write.commit([generateHash(parseEther("7"), "a")], {
      value: parseEther("9"),
      account: bidder1.account,
    });
    await blindBid.write.commit([generateHash(parseEther("7"), "b")], {
      value: parseEther("9"),
      account: bidder2.account,
    });

    await networkHelpers.time.increase(61);

    await blindBid.write.reveal([parseEther("7"), "a"], { account: bidder1.account });
    const firstHighestBidder = (await blindBid.read.highestBidder()) as Address;

    await blindBid.write.reveal([parseEther("7"), "b"], { account: bidder2.account });
    const secondHighestBidder = (await blindBid.read.highestBidder()) as Address;

    assert.equal(firstHighestBidder.toLowerCase(), bidder1.account.address.toLowerCase());
    assert.equal(secondHighestBidder.toLowerCase(), bidder1.account.address.toLowerCase());
  });

  it("Should block settleAuction before reveal phase ends (PhaseNotActive)", async function () {
    const [, beneficiary] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    await assert.rejects(
      blindBid.write.settleAuction(),
      (err: Error) => err.message.includes("PhaseNotActive"),
      "Contract allowed settle before reveal phase ended",
    );
  });

  it("Should block settleAuction when called twice (AuctionAlreadyEnded)", async function () {
    const [, beneficiary, bidder1] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const bid = parseEther("2");
    const secret = "doubleSettle";
    const hash = generateHash(bid, secret);

    await blindBid.write.commit([hash], { value: parseEther("3"), account: bidder1.account });
    await networkHelpers.time.increase(61);
    await blindBid.write.reveal([bid, secret], { account: bidder1.account });
    await networkHelpers.time.increase(61);

    await blindBid.write.settleAuction();

    await assert.rejects(
      blindBid.write.settleAuction(),
      (err: Error) => err.message.includes("AuctionAlreadyEnded"),
      "Contract allowed settling twice",
    );
  });

  it("Should block withdraw when there is nothing to withdraw (NothingToWithdraw)", async function () {
    const [, beneficiary, user] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    await assert.rejects(
      blindBid.write.withdraw( { account: user.account }),
      (err: Error) => err.message.includes("NothingToWithdraw"),
      "Contract allowed empty withdraw",
    );
  });

  it("Known behavior: unrevealed deposits remain in contract after settlement", async function () {
    const [, beneficiary, nonRevealer, winner] = await viem.getWalletClients();
    const blindBid = await viem.deployContract("BlindBid", [60n, 60n, beneficiary.account.address]);

    const nonRevealDeposit = parseEther("4");
    await blindBid.write.commit([generateHash(parseEther("2"), "willNotReveal")], {
      value: nonRevealDeposit,
      account: nonRevealer.account,
    });

    await blindBid.write.commit([generateHash(parseEther("3"), "winner")], {
      value: parseEther("5"),
      account: winner.account,
    });

    await networkHelpers.time.increase(61);
    await blindBid.write.reveal([parseEther("3"), "winner"], { account: winner.account });
    await networkHelpers.time.increase(61);

    const contractBalanceBeforeSettle = await publicClient.getBalance({ address: blindBid.address });
    await blindBid.write.settleAuction();
    const contractBalanceAfterSettle = await publicClient.getBalance({ address: blindBid.address });

    assert.equal(
      contractBalanceBeforeSettle - contractBalanceAfterSettle,
      parseEther("3"),
      "Unexpected value transferred during settlement",
    );
    const winnerPendingRefund = parseEther("2");
    assert.equal(
      contractBalanceAfterSettle,
      nonRevealDeposit + winnerPendingRefund,
      "Unexpected remaining contract balance after settlement",
    );
  });
});