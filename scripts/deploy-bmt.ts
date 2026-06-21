import { getAddress } from "viem";
import { network } from "hardhat";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

const adminWallet = getAddress(requiredEnv("ADMIN_WALLET_ADDRESS"));
const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [deployer] = await viem.getWalletClients();
const deployGasLimit = 5_000_000n;

console.log(`Deploying Big Medal Token from ${deployer.account.address}`);
console.log(`Owner and initial recipient: ${adminWallet}`);
console.log(`Deployment gas limit: ${deployGasLimit}`);

const { contract: token, deploymentTransaction } = await viem.sendDeploymentTransaction(
  "BigMedalToken",
  [adminWallet],
  { gas: deployGasLimit }
);
const deploymentTx = await publicClient.waitForTransactionReceipt({ hash: deploymentTransaction.hash });

console.log(`BMT deployed: ${token.address}`);
console.log(`Deployment tx: ${deploymentTx.transactionHash}`);
console.log(`Deployment gas used: ${deploymentTx.gasUsed}`);
console.log("Set NEXT_PUBLIC_BMT_TOKEN_ADDRESS to this contract address after verification.");
