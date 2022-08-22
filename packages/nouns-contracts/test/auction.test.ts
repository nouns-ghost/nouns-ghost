import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { constants } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import {
  MaliciousBidder__factory as MaliciousBidderFactory,
  NounsAuctionHouse,
  NounsDescriptor__factory as NounsDescriptorFactory,
  NounsToken,
  WETH,
} from '../typechain';
import { deployNounsToken, deployWeth, populateDescriptor } from './utils';

chai.use(solidity);
const { expect } = chai;

describe('NounsAuctionHouse', () => {
  let nounsAuctionHouse: NounsAuctionHouse;
  let nounsToken: NounsToken;
  let weth: WETH;
  let deployer: SignerWithAddress;
  let noundersDAO: SignerWithAddress;
  let bidderA: SignerWithAddress;
  let bidderB: SignerWithAddress;
  let snapshotId: number;

  const TIME_BUFFER = 15 * 60;
  const RESERVE_PRICE = 2;
  const MIN_INCREMENT_BID_PERCENTAGE = 5;
  const DURATION = 60 * 60 * 24;
  const OPACITIES = [10, 25, 30, 35, 40];
  const OPACITY_INDEX = 2;

  async function deploy(deployer?: SignerWithAddress) {
    const auctionHouseFactory = await ethers.getContractFactory('NounsAuctionHouse', deployer);
    return upgrades.deployProxy(auctionHouseFactory, [
      nounsToken.address,
      weth.address,
      TIME_BUFFER,
      RESERVE_PRICE,
      MIN_INCREMENT_BID_PERCENTAGE,
      DURATION,
      OPACITIES,
      OPACITY_INDEX,
    ]) as Promise<NounsAuctionHouse>;
  }

  async function deployFailure(deployer?: SignerWithAddress) {
    const auctionHouseFactory = await ethers.getContractFactory('NounsAuctionHouse', deployer);
    return upgrades.deployProxy(auctionHouseFactory, [
      nounsToken.address,
      weth.address,
      TIME_BUFFER,
      RESERVE_PRICE,
      MIN_INCREMENT_BID_PERCENTAGE,
      DURATION,
      OPACITIES,
      5,
    ]) as Promise<NounsAuctionHouse>;
  }

  before(async () => {
    [deployer, noundersDAO, bidderA, bidderB] = await ethers.getSigners();

    nounsToken = await deployNounsToken(deployer, noundersDAO.address, deployer.address);
    weth = await deployWeth(deployer);

    await expect(deployFailure(deployer)).to.be.revertedWith('opacity index exceeds opacity array length');
    nounsAuctionHouse = await deploy(deployer);

    const descriptor = await nounsToken.descriptor();

    await populateDescriptor(NounsDescriptorFactory.connect(descriptor, deployer));

    await nounsToken.setMinter(nounsAuctionHouse.address);
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId]);
  });

  it('should revert if a second initialization is attempted', async () => {
    const tx = nounsAuctionHouse.initialize(
      nounsToken.address,
      weth.address,
      TIME_BUFFER,
      RESERVE_PRICE,
      MIN_INCREMENT_BID_PERCENTAGE,
      DURATION,
      [10, 25, 30, 35, 40],
      2,
    );
    await expect(tx).to.be.revertedWith('Initializable: contract is already initialized');
  });

  it('should allow the noundersDAO to unpause the contract and create the first auction', async () => {
    const tx = await nounsAuctionHouse.unpause();
    await tx.wait();

    const auction = await nounsAuctionHouse.auction();
    expect(auction.startTime.toNumber()).to.be.greaterThan(0);
  });

  it('should revert if a user creates a bid for an inactive auction', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();
    const tx = nounsAuctionHouse.connect(bidderA).createBid(nounId.add(1), {
      value: RESERVE_PRICE,
    });

    await expect(tx).to.be.revertedWith('Noun not up for auction');
  });

  it('should revert if a user creates a bid for an expired auction', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours

    const { nounId } = await nounsAuctionHouse.auction();
    const tx = nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });

    await expect(tx).to.be.revertedWith('Auction expired');
  });

  it('should revert if a user creates a bid with an amount below the reserve price', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();
    const tx = nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE - 1,
    });

    await expect(tx).to.be.revertedWith('Must send at least reservePrice');
  });

  it('should revert if a user creates a bid less than the min bid increment percentage', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();
    await nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE * 50,
    });
    const tx = nounsAuctionHouse.connect(bidderB).createBid(nounId, {
      value: RESERVE_PRICE * 51,
    });

    await expect(tx).to.be.revertedWith(
      'Must send more than last bid by minBidIncrementPercentage amount',
    );
  });

  it('should refund the previous bidder when the following user creates a bid', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();
    await nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });

    const bidderAPostBidBalance = await bidderA.getBalance();
    await nounsAuctionHouse.connect(bidderB).createBid(nounId, {
      value: RESERVE_PRICE * 2,
    });
    const bidderAPostRefundBalance = await bidderA.getBalance();

    expect(bidderAPostRefundBalance).to.equal(bidderAPostBidBalance.add(RESERVE_PRICE));
  });

  it('should cap the maximum bid griefing cost at 30K gas + the cost to wrap and transfer WETH', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();

    const maliciousBidderFactory = new MaliciousBidderFactory(bidderA);
    const maliciousBidder = await maliciousBidderFactory.deploy();

    const maliciousBid = await maliciousBidder
      .connect(bidderA)
      .bid(nounsAuctionHouse.address, nounId, {
        value: RESERVE_PRICE,
      });
    await maliciousBid.wait();

    const tx = await nounsAuctionHouse.connect(bidderB).createBid(nounId, {
      value: RESERVE_PRICE * 2,
      gasLimit: 1_000_000,
    });
    const result = await tx.wait();

    expect(result.gasUsed.toNumber()).to.be.lessThan(200_000);
    expect(await weth.balanceOf(maliciousBidder.address)).to.equal(RESERVE_PRICE);
  });

  it('should emit an `AuctionBid` event on a successful bid', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();
    const tx = nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });

    await expect(tx)
      .to.emit(nounsAuctionHouse, 'AuctionBid')
      .withArgs(nounId, bidderA.address, RESERVE_PRICE, false);
  });

  it('should emit an `AuctionExtended` event if the auction end time is within the time buffer', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId, endTime } = await nounsAuctionHouse.auction();

    await ethers.provider.send('evm_setNextBlockTimestamp', [endTime.sub(60 * 5).toNumber()]); // Subtract 5 mins from current end time

    const tx = nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });

    await expect(tx)
      .to.emit(nounsAuctionHouse, 'AuctionExtended')
      .withArgs(nounId, endTime.add(60 * 10));
  });

  it('should revert if auction settlement is attempted while the auction is still active', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();

    await nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });
    const tx = nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction();

    await expect(tx).to.be.revertedWith("Auction hasn't completed");
  });

  it('should emit `AuctionSettled` and `AuctionCreated` events if all conditions are met', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();

    await nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });

    await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
    const tx = await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction();

    const receipt = await tx.wait();
    const { timestamp } = await ethers.provider.getBlock(receipt.blockHash);

    const settledEvent = receipt.events?.find(e => e.event === 'AuctionSettled');
    const createdEvent = receipt.events?.find(e => e.event === 'AuctionCreated');

    expect(settledEvent?.args?.nounId).to.equal(nounId);
    expect(settledEvent?.args?.winner).to.equal(bidderA.address);
    expect(settledEvent?.args?.amount).to.equal(RESERVE_PRICE);

    expect(createdEvent?.args?.nounId).to.equal(nounId.add(1));
    expect(createdEvent?.args?.startTime).to.equal(timestamp);
    expect(createdEvent?.args?.endTime).to.equal(timestamp + DURATION);
  });

  it('should not create a new auction if the auction house is paused and unpaused while an auction is ongoing', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    await (await nounsAuctionHouse.pause()).wait();

    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();

    expect(nounId).to.equal(1);
  });

  it('should create a new auction if the auction house is paused and unpaused after an auction is settled', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();

    await nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });

    await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours

    await (await nounsAuctionHouse.pause()).wait();

    const settleTx = nounsAuctionHouse.connect(bidderA).settleAuction();

    await expect(settleTx)
      .to.emit(nounsAuctionHouse, 'AuctionSettled')
      .withArgs(nounId, bidderA.address, RESERVE_PRICE);

    const unpauseTx = await nounsAuctionHouse.unpause();
    const receipt = await unpauseTx.wait();
    const { timestamp } = await ethers.provider.getBlock(receipt.blockHash);

    const createdEvent = receipt.events?.find(e => e.event === 'AuctionCreated');

    expect(createdEvent?.args?.nounId).to.equal(nounId.add(1));
    expect(createdEvent?.args?.startTime).to.equal(timestamp);
    expect(createdEvent?.args?.endTime).to.equal(timestamp + DURATION);
  });

  it('should settle the current auction and pause the contract if the minter is updated while the auction house is unpaused', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();

    await nounsAuctionHouse.connect(bidderA).createBid(nounId, {
      value: RESERVE_PRICE,
    });

    await nounsToken.setMinter(constants.AddressZero);

    await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours

    const settleTx = nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction();

    await expect(settleTx)
      .to.emit(nounsAuctionHouse, 'AuctionSettled')
      .withArgs(nounId, bidderA.address, RESERVE_PRICE);

    const paused = await nounsAuctionHouse.paused();

    expect(paused).to.equal(true);
  });

  it('should burn a Noun on auction settlement if no bids are received', async () => {
    await (await nounsAuctionHouse.unpause()).wait();

    const { nounId } = await nounsAuctionHouse.auction();

    await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours

    const tx = nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction();

    await expect(tx)
      .to.emit(nounsAuctionHouse, 'AuctionSettled')
      .withArgs(nounId, '0x0000000000000000000000000000000000000000', 0);
  });

  describe('vote', async () => {
    it('happy path', async () => {
      await (await nounsAuctionHouse.unpause()).wait();

      const { nounId, opacity } = await nounsAuctionHouse.auction();
      expect(opacity).to.equal(30)

      await (await nounsAuctionHouse.connect(bidderA).createBid(nounId, {value: RESERVE_PRICE + 1,})).wait();

      for(let i = 0; i < OPACITIES.length; i++) {
        const vote = await nounsAuctionHouse.votes(i);
        expect(vote).equal(0);
      }

      await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
      await (await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction()).wait();

      const owner = await nounsToken.ownerOf(nounId);
      expect(owner).to.equal(bidderA.address);

      const voteFor = 3;
      await (await nounsAuctionHouse.connect(bidderA).vote(nounId, voteFor)).wait();

      for(let i = 0; i < OPACITIES.length; i++) {
        const vote = await nounsAuctionHouse.votes(i);
        if (i == voteFor) {
          expect(vote).equal(1);
        } else {
          expect(vote).equal(0);
        }
      }
    });

    it('tokenOfOwnerNotVoted', async () => {
      await (await nounsAuctionHouse.unpause()).wait();

      const BIDS = 3;
      for(let i = 0; i < BIDS; i++) {
        const { nounId } = await nounsAuctionHouse.auction();

        await (await nounsAuctionHouse.connect(bidderA).createBid(nounId, {value: RESERVE_PRICE + 1,})).wait();
        await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
        await (await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction()).wait();

        const owner = await nounsToken.ownerOf(nounId);
        expect(owner).to.equal(bidderA.address);
      }

      const [ tokensBefore, sizeBefore ] = await nounsToken.tokenOfOwnerNotVoted(bidderA.address);
      expect(sizeBefore).equal(BIDS);

      for(let i = 0; i < sizeBefore.toNumber(); i++) {
        expect(tokensBefore[i].toNumber()).equal(i + 1);
      }

      const VOTE = 2;
      await (await nounsAuctionHouse.connect(bidderA).vote(VOTE, 0)).wait();

      const [ tokensAfter, sizeAfter ] = await nounsToken.tokenOfOwnerNotVoted(bidderA.address);
      expect(sizeAfter).equal(BIDS - 1);

      for(let i = 0, j = 0; i < sizeAfter.toNumber() + 1; i++) {
        if(i + 1 == VOTE) {
          j++;
          continue;
        }

        expect(tokensAfter[i - j].toNumber()).equal(i + 1);
      }
    });

    it('tie votes', async () => {
      await (await nounsAuctionHouse.unpause()).wait();

      const { nounId } = await nounsAuctionHouse.auction();

      for (let i = 0; i < 2; i++) {
        await (await nounsAuctionHouse.connect(bidderA).createBid(nounId.add(i), {value: RESERVE_PRICE + 1,})).wait();

        for(let i = 0; i < OPACITIES.length; i++) {
          const vote = await nounsAuctionHouse.votes(i);
          expect(vote).equal(0);
        }

        await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
        await (await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction()).wait();

        const owner = await nounsToken.ownerOf(nounId.add(i));
        expect(owner).to.equal(bidderA.address);
      }

      const voteFor = [1, 2];
      for (let i = 0; i < 2; i++) {
        await (await nounsAuctionHouse.connect(bidderA).vote(nounId.add(i), voteFor[i])).wait();
      }

      for(let i = 0; i < OPACITIES.length; i++) {
        const vote = await nounsAuctionHouse.votes(i);
        if (voteFor.indexOf(i) != -1) {
          expect(vote).equal(1);
        } else {
          expect(vote).equal(0);
        }
      }

      await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
      await (await nounsAuctionHouse.connect(bidderB).settleCurrentAndCreateNewAuction()).wait();

      const opacityIndex = await nounsAuctionHouse.opacityIndex();
      expect(opacityIndex).equal(Math.max(...voteFor));
    });

    it('non-tie votes', async () => {
      await (await nounsAuctionHouse.unpause()).wait();

      const { nounId } = await nounsAuctionHouse.auction();

      for (let i = 0; i < 3; i++) {
        await (await nounsAuctionHouse.connect(bidderA).createBid(nounId.add(i), {value: RESERVE_PRICE + 1,})).wait();

        for(let i = 0; i < OPACITIES.length; i++) {
          const vote = await nounsAuctionHouse.votes(i);
          expect(vote).equal(0);
        }

        await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
        await (await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction()).wait();

        const owner = await nounsToken.ownerOf(nounId.add(i));
        expect(owner).to.equal(bidderA.address);
      }

      const voteFor = [1, 2, 2];
      for (let i = 0; i < 3; i++) {
        await (await nounsAuctionHouse.connect(bidderA).vote(nounId.add(i), voteFor[i])).wait();
      }

      for(let i = 0; i < OPACITIES.length; i++) {
        const vote = await nounsAuctionHouse.votes(i);
        if (i == 1) {
          expect(vote).equal(1);
        } else if (i == 2) {
          expect(vote).equal(2);
        } else {
          expect(vote).equal(0);
        }
      }

      await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
      await (await nounsAuctionHouse.connect(bidderB).settleCurrentAndCreateNewAuction()).wait();

      const opacityIndex = await nounsAuctionHouse.opacityIndex();
      expect(opacityIndex).equal(2);
    });

    it('sholud fail if the voder does not own the noun', async () => {
      await (await nounsAuctionHouse.unpause()).wait();

      const { nounId } = await nounsAuctionHouse.auction();

      await (await nounsAuctionHouse.connect(bidderA).createBid(nounId, {value: RESERVE_PRICE + 1,})).wait();

      await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
      await (await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction()).wait();

      const owner = await nounsToken.ownerOf(nounId);
      expect(owner).to.equal(bidderA.address);

      await expect(nounsAuctionHouse.connect(bidderB).vote(nounId, 0)).to.be.revertedWith('non nouns holder');
    });

    it('should fail if the index is out of bounds', async () => {
      await (await nounsAuctionHouse.unpause()).wait();

      const { nounId } = await nounsAuctionHouse.auction();

      await (await nounsAuctionHouse.connect(bidderA).createBid(nounId, {value: RESERVE_PRICE + 1,})).wait();

      await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
      await (await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction()).wait();

      const owner = await nounsToken.ownerOf(nounId);
      expect(owner).to.equal(bidderA.address);

      await expect(nounsAuctionHouse.connect(bidderA).vote(nounId, OPACITIES.length)).to.be.revertedWith('out of bound index');
    });

    it('should fail for double votes', async () => {
      await (await nounsAuctionHouse.unpause()).wait();

      const { nounId } = await nounsAuctionHouse.auction();

      await (await nounsAuctionHouse.connect(bidderA).createBid(nounId, {value: RESERVE_PRICE + 1,})).wait();

      for(let i = 0; i < OPACITIES.length; i++) {
        const vote = await nounsAuctionHouse.votes(i);
        expect(vote).equal(0);
      }

      await ethers.provider.send('evm_increaseTime', [60 * 60 * 25]); // Add 25 hours
      await (await nounsAuctionHouse.connect(bidderA).settleCurrentAndCreateNewAuction()).wait();

      const owner = await nounsToken.ownerOf(nounId);
      expect(owner).to.equal(bidderA.address);

      const voteFor = 0;
      await (await nounsAuctionHouse.connect(bidderA).vote(nounId, voteFor)).wait();

      for(let i = 0; i < OPACITIES.length; i++) {
        const vote = await nounsAuctionHouse.votes(i);
        if (i == voteFor) {
          expect(vote).equal(1);
        } else {
          expect(vote).equal(0);
        }
      }

      await expect(nounsAuctionHouse.connect(bidderA).vote(nounId, voteFor)).to.be.revertedWith('the token has been already used for vote');
    });

  });
});
