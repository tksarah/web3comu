import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("BigMedalToken", async function () {
  const connection = await network.create();
  const { networkHelpers, viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [owner, user, minter, outsider] = await viem.getWalletClients();

  async function deploy() {
    const token = await viem.deployContract("BigMedalToken", [owner.account.address]);
    return token;
  }

  async function asAccount(tokenAddress: `0x${string}`, walletClient: typeof owner) {
    return viem.getContractAt("BigMedalToken", tokenAddress, {
      client: {
        public: publicClient,
        wallet: walletClient
      }
    });
  }

  it("sets metadata, owner, supply, and cap", async function () {
    const token = await deploy();

    assert.equal(await token.read.name(), "Big Medal Token");
    assert.equal(await token.read.symbol(), "BMT");
    assert.equal(await token.read.decimals(), 18);
    assert.equal(String(await token.read.owner()).toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(await token.read.totalSupply(), parseEther("1000000"));
    assert.equal(await token.read.cap(), parseEther("10000000"));
    assert.equal(await token.read.balanceOf([owner.account.address]), parseEther("1000000"));
  });

  it("allows owner and approved minters to mint", async function () {
    const token = await deploy();

    await token.write.mint([user.account.address, parseEther("5")]);
    assert.equal(await token.read.balanceOf([user.account.address]), parseEther("5"));

    await token.write.setMinter([minter.account.address, true]);
    const minterToken = await asAccount(token.address, minter);
    await minterToken.write.mint([user.account.address, parseEther("3")]);
    assert.equal(await token.read.balanceOf([user.account.address]), parseEther("8"));
  });

  it("rejects mint from unapproved accounts", async function () {
    const token = await deploy();
    const outsiderToken = await asAccount(token.address, outsider);

    await assert.rejects(outsiderToken.write.mint([outsider.account.address, parseEther("1")]));
  });

  it("rejects mints beyond the supply cap", async function () {
    const token = await deploy();

    await assert.rejects(token.write.mint([owner.account.address, parseEther("9000001")]));
  });

  it("rejects login bonus claims from accounts below the required balance", async function () {
    const token = await deploy();
    const userToken = await asAccount(token.address, user);

    assert.equal(await token.read.canClaimLoginBonus([user.account.address]), false);
    await assert.rejects(userToken.write.claimLoginBonus());
  });

  it("allows one login bonus claim per JST day for BMT holders", async function () {
    const token = await deploy();
    await token.write.mint([user.account.address, parseEther("1")]);
    const userToken = await asAccount(token.address, user);

    assert.equal(await token.read.canClaimLoginBonus([user.account.address]), true);
    await userToken.write.claimLoginBonus();
    assert.equal(await token.read.balanceOf([user.account.address]), parseEther("2"));
    assert.equal(await token.read.canClaimLoginBonus([user.account.address]), false);
    await assert.rejects(userToken.write.claimLoginBonus());

    const latest = await networkHelpers.time.latest();
    const nextJstDayStart = Math.floor((latest + 9 * 60 * 60) / 86_400) * 86_400 + 86_400 - 9 * 60 * 60;
    await networkHelpers.time.increaseTo(nextJstDayStart + 1);

    assert.equal(await token.read.canClaimLoginBonus([user.account.address]), true);
    await userToken.write.claimLoginBonus();
    assert.equal(await token.read.balanceOf([user.account.address]), parseEther("3"));
  });
});
