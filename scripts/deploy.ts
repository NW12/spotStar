// We require the Hardhat Runtime Environment explicitly here. This is optional but useful for running the
// script in a standalone fashion through `node <script>`. When running the script with `hardhat run <script>`,
// you'll find the Hardhat Runtime Environment's members available in the global scope.
import hre, { ethers } from "hardhat";
import { Console } from "node:console";
import { SpotStarIco,SpotStarIco__factory } from "../typechain";

async function main(): Promise<void> {
  const signers = await hre.ethers.getSigners()
  const SpotStarIco = await ethers.getContractFactory("SpotStarIco") as SpotStarIco__factory;
  // spotStar Token mainnet address is 0x810bdba1eb5c70c4dc0dbe3bbaf18fffd31c01d1
  // this is test token address for testing purposes 0x318f4d534e9A03A96ad9cA35AeBC2b097D860000
  const ico: SpotStarIco = await SpotStarIco.deploy("0x318f4d534e9A03A96ad9cA35AeBC2b097D860000",signers[0].address);
  await ico.deployed();
  console.log("Deployer :",signers[0].address);
  console.log("SpotStarIco deployed to: ", ico.address);
}

// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
