import { expect } from "chai";
import "@nomiclabs/hardhat-ethers";
import hre, { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
const { deployContract } = waffle;
import { Signers } from "../types";
import { Contract, BigNumber, Signer } from "ethers";
import { increaseTime } from "./Utilities";
import { SpotStar } from "../typechain/SpotStar";
import { SpotStarIco } from "../typechain/SpotStarIco";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import _ from "underscore";
import { RefundVault__factory } from "../typechain";

describe("SpotStarIco", function () {
  let icoContract: Contract;
  let token: Contract;
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.user_1 = signers[1];
    this.signers.user_2 = signers[2];
    this.signers.user_3 = signers[3];
    this.signers.user_4 = signers[4];
    this.signers.wallet = signers[5];
    this.signers.investor1 = signers[6];
    this.signers.investor2 = signers[7];
    this.signers.investor3 = signers[8];
    this.signers.investor4 = signers[9];
    this.signers.investor5 = signers[10];
    this.signers.investor6 = signers[11];
    this.signers.investor7 = signers[12];
    const tokenArtifact: Artifact = await artifacts.readArtifact("SpotStar");
    token = <SpotStar>await deployContract(this.signers.admin, tokenArtifact, ["ERC-20 Token", "ERC"]);

    const icoArtifact: Artifact = await artifacts.readArtifact("SpotStarIco");
    icoContract = <SpotStarIco>(
      await deployContract(this.signers.admin, icoArtifact, [token.address, await this.signers.wallet.getAddress()])
    );
  });

  it("Transfer 140 Million tokens to ICO contract", async function () {
    expect(() => token.transfer(icoContract.address, ethers.utils.parseEther("140000000"))).to.be.changeTokenBalance(
      token,
      icoContract as unknown as Signer,
      ethers.utils.parseEther("140000000"),
    );
  });
  it("Verify total tokens for sale are 140 Million", async function () {
    expect(await icoContract.callStatic.totalTokensForSale()).to.equal(ethers.utils.parseEther("140000000"));
  });
  it("Verify default stage in preIco", async function () {
    expect(await icoContract.callStatic.stage()).to.equal(BigNumber.from(0));
  });
  it("Verify ICO timelines", async function () {
    expect(await icoContract.callStatic.startingTimes(BigNumber.from(0))).to.equal(BigNumber.from(1630454400));
    expect(await icoContract.callStatic.startingTimes(BigNumber.from(1))).to.equal(BigNumber.from(1632614400));
    expect(await icoContract.callStatic.startingTimes(BigNumber.from(2))).to.equal(BigNumber.from(1633737600));
    expect(await icoContract.callStatic.startingTimes(BigNumber.from(3))).to.equal(BigNumber.from(1636502400));

    expect(await icoContract.callStatic.endingTimes(BigNumber.from(0))).to.equal(BigNumber.from(1632614399));
    expect(await icoContract.callStatic.endingTimes(BigNumber.from(1))).to.equal(BigNumber.from(1633737599));
    expect(await icoContract.callStatic.endingTimes(BigNumber.from(2))).to.equal(BigNumber.from(1636502399));
    expect(await icoContract.callStatic.endingTimes(BigNumber.from(3))).to.equal(BigNumber.from(1639180799));
  });
  it("Verify ICO rates", async function () {
    expect(await icoContract.callStatic.rates(BigNumber.from(0))).to.equal(ethers.utils.parseEther("1000"));
    expect(await icoContract.callStatic.rates(BigNumber.from(1))).to.equal(ethers.utils.parseEther("2000"));
    expect(await icoContract.callStatic.rates(BigNumber.from(2))).to.equal(ethers.utils.parseEther("3000"));
    expect(await icoContract.callStatic.rates(BigNumber.from(3))).to.equal(ethers.utils.parseEther("4000"));
  });
  it("Verify that HardCap is 100000 Ether", async function () {
    expect(await icoContract.callStatic.MAXIMUM_GOAL()).to.equal(ethers.utils.parseEther("100000"));
  });
  it("Verify that SoftCap is 5000 Ether", async function () {
    expect(await icoContract.callStatic.MINIMUM_GOAL()).to.equal(ethers.utils.parseEther("5000"));
  });
  it("Verify token address", async function () {
    expect(await icoContract.callStatic.token()).to.equal(token.address);
  });
  it("Verify that maximum deposit amount is 10000 ether", async function () {
    expect(await icoContract.callStatic.maxEtherAmount()).to.equal(ethers.utils.parseEther("10000"));
  });
  it("Verify that minimum deposit amount is 0.05 ether", async function () {
    expect(await icoContract.callStatic.minEtherAmount()).to.equal(ethers.utils.parseEther("0.05"));
  });
  it("Throw, If Private Sale is not started yet", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const startTime = await icoContract.callStatic.startingTimes(BigNumber.from(0));
    await increaseTime(-(now - (startTime - 100)));
    await expect(
      icoContract
        .connect(this.signers.admin)
        .addInvestorAllocation(
          [
            await this.signers.investor1.getAddress(),
            await this.signers.investor2.getAddress(),
            await this.signers.investor3.getAddress(),
            await this.signers.investor4.getAddress(),
          ],
          [
            ethers.utils.parseEther("10000"),
            ethers.utils.parseEther("10000"),
            ethers.utils.parseEther("10000"),
            ethers.utils.parseEther("5000"),
          ],
        ),
    ).to.be.revertedWith("Crowdsale: PRIVATE_SALE_NOT_STARTED");
  });
  it("Add private innvestors address for private sale", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const startTime = await icoContract.callStatic.startingTimes(BigNumber.from(0));
    await increaseTime(startTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .addInvestorAllocation(
          [
            await this.signers.investor1.getAddress(),
            await this.signers.investor2.getAddress(),
            await this.signers.investor3.getAddress(),
            await this.signers.investor4.getAddress(),
          ],
          [
            ethers.utils.parseEther("10000"),
            ethers.utils.parseEther("10000"),
            ethers.utils.parseEther("10000"),
            ethers.utils.parseEther("5000"),
          ],
        ),
    )
      .to.be.emit(icoContract, "Investors")
      .withArgs(await this.signers.investor1.getAddress(), ethers.utils.parseEther("10000"));
  });
  it("Throw, if Process Private Sale distributions be ico end", async function () {
    expect(icoContract.connect(this.signers.admin).distributeToPrivateInvestors(BigNumber.from(4))).to.be.revertedWith(
      "NOT_ENDED",
    );
  });
  it("Throw, user send ether to ico contract in Private sale period", async function () {
    await icoContract.connect(this.signers.admin).addWhitelist(this.signers.admin.address);
    await icoContract.connect(this.signers.admin).addWhitelist(this.signers.user_1.address);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10") }),
    ).to.be.revertedWith("Crowdsale: PRIVATE_SALE_IS_RUNNING");
  });
  it("Throw, if Private Sale is limit reached", async function () {
    await icoContract.connect(this.signers.admin).addWhitelist(this.signers.admin.address);
    await icoContract.connect(this.signers.admin).addWhitelist(this.signers.user_1.address);
    expect(
      icoContract
        .connect(this.signers.admin)
        .addInvestorAllocation([await this.signers.investor5.getAddress()], [ethers.utils.parseEther("5000")]),
    ).to.be.revertedWith("PRIVATE_SALE_TOKENS_SOLD_OUT");
  });
  it("Throw, If private sale is finished and user try to buy token in private sale", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_2.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: PRIVATE_SALE_IS_RUNNING");
  });
  it("Throw, If private sale is finished and owner try to add investors allocations in private sale", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const endTime = await icoContract.callStatic.endingTimes(BigNumber.from(0));
    await increaseTime(endTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .addInvestorAllocation([await this.signers.investor1.getAddress()], [ethers.utils.parseEther("10000")]),
    ).to.be.revertedWith("Crowdsale: PRIVATE_SALE_ENDED");
  });
  it("Set Pre-Ico stage", async function () {
    await expect(icoContract.connect(this.signers.admin).setCrowdsaleStage(BigNumber.from(1)))
      .emit(icoContract, "StageTokenInfo")
      .withArgs(BigNumber.from(1), ethers.utils.parseEther("55960000"));
  });
  it("Verify Pre-Ico not started yet", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const startTime = await icoContract.callStatic.startingTimes(BigNumber.from(1));
    await increaseTime(-(now - (startTime - 100)));
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: PREICO_NOT_STARTED");
  });
  it("Successfully buy tokens in Pre-Ico", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const startTime = await icoContract.callStatic.startingTimes(BigNumber.from(1));
    await increaseTime(startTime - now + 10);

    const vault = await icoContract.callStatic.vault();
    const RefundVault = new RefundVault__factory(this.signers.admin);
    const Vault = RefundVault.attach(vault);
    await increaseTime(150);
    await expect(async () =>
      icoContract
        .connect(this.signers.user_2)
        .buyTokens(await this.signers.user_2.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.changeEtherBalance(this.signers.user_2, ethers.utils.parseEther("-1"));

    await expect(async () =>
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_2.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).changeEtherBalance(Vault as unknown as Signer, ethers.utils.parseEther("1"));

    await expect(async () =>
      icoContract
        .connect(this.signers.user_2)
        .buyTokens(await this.signers.user_2.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).changeTokenBalance(token, this.signers.user_2, ethers.utils.parseEther("2000"));

    await expect(
      icoContract
        .connect(this.signers.user_2)
        .buyTokens(await this.signers.user_2.getAddress(), { value: ethers.utils.parseEther("1") }),
    )
      .to.emit(icoContract, "TokenPurchase")
      .withArgs(
        await this.signers.user_2.getAddress(),
        await this.signers.user_2.getAddress(),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("2000"),
      );
  });
  it("Throw, If deposit amount is less than 0.05 ether", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("0.04") }),
    ).to.be.revertedWith("Crowdsale: Minimum deposit is 0.05");
  });
  it("Throw, If deposit amount is greater than 10000 ether", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10001") }),
    ).to.be.revertedWith("Crowdsale: Maximum deposit is 10000");
  });
  it("Throw, if Pre-Ico is limit reached", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10000") }),
    )
      .to.emit(icoContract, "TokenPurchase")
      .withArgs(
        await this.signers.admin.getAddress(),
        await this.signers.user_1.getAddress(),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("20000000"),
      );

    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10000") }),
    )
      .to.emit(icoContract, "TokenPurchase")
      .withArgs(
        await this.signers.admin.getAddress(),
        await this.signers.user_1.getAddress(),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("20000000"),
      );
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("7976") }),
    )
      .to.emit(icoContract, "TokenPurchase")
      .withArgs(
        await this.signers.admin.getAddress(),
        await this.signers.user_1.getAddress(),
        ethers.utils.parseEther("7976"),
        ethers.utils.parseEther("15952000"),
      );
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10") }),
    ).to.be.revertedWith("PRE_ICO_TOKENS_SOLD_OUT");
  });
  it("Throw, if user buy tokens after pre-ico end", async function () {
    const now = await (await ethers.provider.getBlock("latest")).timestamp;
    const endTime = await icoContract.callStatic.endingTimes(BigNumber.from(1));
    await increaseTime(endTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: PREICO_ENDED");
  });
  it("Set Ico-round-one stage", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const startTime = await icoContract.callStatic.startingTimes(BigNumber.from(2));
    await increaseTime(startTime - now - 10);
    await expect(icoContract.connect(this.signers.admin).setCrowdsaleStage(BigNumber.from(2)))
      .emit(icoContract, "StageTokenInfo")
      .withArgs(BigNumber.from(2), ethers.utils.parseEther("42000000"));
  });
  it("Throw, If Ico-round-one is not started yet", async function () {
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: ICO_ROUND_ONE_NOT_STARTED");
    await increaseTime(12);
  });
  it("Successfully buy tokens in ico round one", async function () {
    const vault = await icoContract.callStatic.vault();
    const RefundVault = new RefundVault__factory(this.signers.admin);
    const Vault = RefundVault.attach(vault);
    await expect(async () =>
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.changeEtherBalance(Vault as unknown as Signer, ethers.utils.parseEther("1"));

    await expect(async () =>
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.changeTokenBalance(token, this.signers.user_1, ethers.utils.parseEther("3000"));
  });
  it("Throw, if Ico round one limit is reached", async function () {
    await icoContract
      .connect(this.signers.admin)
      .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10000") });
    await icoContract
      .connect(this.signers.admin)
      .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("3998") });
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10") }),
    ).to.be.revertedWith("ICO_ROUND_ONE_TOKENS_SOLD_OUT");
  });
  it("Throw, if user buy tokens after ico round one end", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const endTime = await icoContract.callStatic.endingTimes(BigNumber.from(2));
    await increaseTime(endTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: ICO_ROUND_ONE_ENDED");
    await increaseTime(-12);
  });
  it("Set Ico-round-two stage", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const startTime = await icoContract.callStatic.startingTimes(BigNumber.from(3));
    await increaseTime(startTime - now);
    await expect(icoContract.connect(this.signers.admin).setCrowdsaleStage(BigNumber.from(3)))
      .emit(icoContract, "StageTokenInfo")
      .withArgs(BigNumber.from(3), ethers.utils.parseEther("42000000"));
  });
  it("Throw, If Ico-round-two is not started yet", async function () {
    await increaseTime(-10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: ICO_ROUND_TWO_NOT_STARTED");
  });
  it("Successfully buy tokens in ico round two", async function () {
    await increaseTime(15);
    const vault = await icoContract.callStatic.vault();
    const RefundVault = new RefundVault__factory(this.signers.admin);
    const Vault = RefundVault.attach(vault);

    await expect(async () =>
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.changeEtherBalance(Vault as unknown as Signer, ethers.utils.parseEther("1"));
    await expect(async () =>
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.changeTokenBalance(token, this.signers.user_1, ethers.utils.parseEther("4000"));
  });
  it("Throw, if Ico round two limit is reached", async function () {
    await icoContract
      .connect(this.signers.admin)
      .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10000") });
    await icoContract
      .connect(this.signers.admin)
      .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("498") });
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("10") }),
    ).to.be.revertedWith("ICO_ROUND_TWO_TOKENS_SOLD_OUT");
  });
  it("Throw, if user buy tokens after ico round one end", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const endTime = await icoContract.callStatic.endingTimes(BigNumber.from(3));
    await increaseTime(endTime - now + 10);
    await expect(
      icoContract
        .connect(this.signers.admin)
        .buyTokens(await this.signers.user_1.getAddress(), { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("Crowdsale: ICO_ROUND_TWO_ENDED");
    await increaseTime(-12);
  });
  it("Throw, if crowdsale is not yet finalized by owner", async function () {
    await expect(icoContract.connect(this.signers.user_1).finish()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });
  // it("Throw, if crowdsale is not yet finalized and owner try to finish it", async function () {
  //   await expect(icoContract.connect(this.signers.admin).finish()).to.be.revertedWith("NOT_ENDED");
  // });
  it("Finalize ico successfully", async function () {
    await increaseTime(12);
    await expect(icoContract.connect(this.signers.admin).finish()).emit(icoContract, "Finalized").withArgs();
  });
});
