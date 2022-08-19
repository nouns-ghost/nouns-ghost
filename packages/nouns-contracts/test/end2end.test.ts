import chai from 'chai';
import { ethers, upgrades } from 'hardhat';
import { BigNumber as EthersBN } from 'ethers';
import { solidity } from 'ethereum-waffle';

import {
  WETH,
  NounsToken,
  NounsAuctionHouse,
  NounsAuctionHouse__factory as NounsAuctionHouseFactory,
  NounsDescriptor,
  NounsDescriptor__factory as NounsDescriptorFactory,
} from '../typechain';

import {
  deployNounsToken,
  deployWeth,
  populateDescriptor,
  blockTimestamp,
  setNextBlockTimestamp,
} from './utils';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

chai.use(solidity);
const { expect } = chai;

let nounsToken: NounsToken;
let nounsAuctionHouse: NounsAuctionHouse;
let descriptor: NounsDescriptor;
let weth: WETH;

let deployer: SignerWithAddress;
let wethDeployer: SignerWithAddress;
let bidderA: SignerWithAddress;
let noundersDAO: SignerWithAddress;

// Auction House Config
const TIME_BUFFER = 15 * 60;
const RESERVE_PRICE = 2;
const MIN_INCREMENT_BID_PERCENTAGE = 5;
const DURATION = 60 * 60 * 24;

async function deploy() {
  [deployer, bidderA, wethDeployer, noundersDAO] = await ethers.getSigners();

  // Deployed by another account to simulate real network

  weth = await deployWeth(wethDeployer);

  // nonce 2: Deploy AuctionHouse
  // nonce 3: Deploy nftDescriptorLibraryFactory
  // nonce 4: Deploy NounsDescriptor
  // nonce 5: Deploy NounsSeeder
  // nonce 6: Deploy NounsToken
  // nonce 0: Deploy NounsDAOExecutor
  // nonce 1: Deploy NounsDAOLogicV1
  // nonce 7: Deploy NounsDAOProxy
  // nonce ++: populate Descriptor
  // nonce ++: set ownable contracts owner to timelock

  // 1. DEPLOY Nouns token
  nounsToken = await deployNounsToken(
    deployer,
    noundersDAO.address,
    deployer.address, // do not know minter/auction house yet
  );

  // 2a. DEPLOY AuctionHouse
  const auctionHouseFactory = await ethers.getContractFactory('NounsAuctionHouse', deployer);
  const nounsAuctionHouseProxy = await upgrades.deployProxy(auctionHouseFactory, [
    nounsToken.address,
    weth.address,
    TIME_BUFFER,
    RESERVE_PRICE,
    MIN_INCREMENT_BID_PERCENTAGE,
    DURATION,
    [10, 25, 30, 35, 40],
    2,
  ]);

  // 2b. CAST proxy as AuctionHouse
  nounsAuctionHouse = NounsAuctionHouseFactory.connect(nounsAuctionHouseProxy.address, deployer);

  // 3. SET MINTER
  await nounsToken.setMinter(nounsAuctionHouse.address);

  // 4. POPULATE body parts
  descriptor = NounsDescriptorFactory.connect(await nounsToken.descriptor(), deployer);

  await populateDescriptor(descriptor);

  // 10. UNPAUSE auction and kick off first mint
  await nounsAuctionHouse.unpause();
}

describe('End to End test with deployment, auction, proposing, voting, executing', async () => {
  before(deploy);

  it('sets all starting params correctly', async () => {
    expect(await nounsToken.minter()).to.equal(nounsAuctionHouse.address);
    expect(await nounsToken.noundersDAO()).to.equal(noundersDAO.address);

    expect(await nounsToken.totalSupply()).to.equal(EthersBN.from('2'));

    expect(await nounsToken.ownerOf(0)).to.equal(noundersDAO.address);
    expect(await nounsToken.ownerOf(1)).to.equal(nounsAuctionHouse.address);

    expect((await nounsAuctionHouse.auction()).nounId).to.equal(EthersBN.from('1'));
  });

  it('allows bidding, settling, and transferring ETH correctly', async () => {
    await nounsAuctionHouse.connect(bidderA).createBid(1, { value: RESERVE_PRICE });
    await setNextBlockTimestamp(Number(await blockTimestamp('latest')) + DURATION);
    await nounsAuctionHouse.settleCurrentAndCreateNewAuction();

    expect(await nounsToken.ownerOf(1)).to.equal(bidderA.address);
  });
});
