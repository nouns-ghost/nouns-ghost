import chai from 'chai';
import { ethers } from 'hardhat';
import { BigNumber as EthersBN, constants } from 'ethers';
import { solidity } from 'ethereum-waffle';
import { NounsDescriptor__factory as NounsDescriptorFactory, NounsToken } from '../typechain';
import { deployNounsToken, populateDescriptor } from './utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { base } from '../typechain/factories/contracts';

chai.use(solidity);
const { expect } = chai;

describe('NounsToken', () => {
  let nounsToken: NounsToken;
  let deployer: SignerWithAddress;
  let noundersDAO: SignerWithAddress;
  let other: SignerWithAddress;
  let snapshotId: number;

  before(async () => {
    [deployer, noundersDAO, other] = await ethers.getSigners();
    nounsToken = await deployNounsToken(deployer, noundersDAO.address, deployer.address);

    const descriptor = await nounsToken.descriptor();

    await populateDescriptor(NounsDescriptorFactory.connect(descriptor, deployer));
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId]);
  });

  it('should allow the minter to mint a noun to itself and a reward noun to the noundersDAO', async () => {
    const receipt = await (await nounsToken.mint(30)).wait();

    const [, , , noundersNounCreated, , , , ownersNounCreated] = receipt.events || [];

    expect(await nounsToken.ownerOf(0)).to.eq(noundersDAO.address);
    expect(noundersNounCreated?.event).to.eq('NounCreated');
    expect(noundersNounCreated?.args?.tokenId).to.eq(0);
    expect(noundersNounCreated?.args?.seed.length).to.equal(5);

    expect(await nounsToken.ownerOf(1)).to.eq(deployer.address);
    expect(ownersNounCreated?.event).to.eq('NounCreated');
    expect(ownersNounCreated?.args?.tokenId).to.eq(1);
    expect(ownersNounCreated?.args?.seed.length).to.equal(5);

    noundersNounCreated?.args?.seed.forEach((item: EthersBN | number) => {
      const value = typeof item !== 'number' ? item?.toNumber() : item;
      expect(value).to.be.a('number');
    });

    ownersNounCreated?.args?.seed.forEach((item: EthersBN | number) => {
      const value = typeof item !== 'number' ? item?.toNumber() : item;
      expect(value).to.be.a('number');
    });
  });

  it('should set symbol', async () => {
    expect(await nounsToken.symbol()).to.eq('NOUN');
  });

  it('should set name', async () => {
    expect(await nounsToken.name()).to.eq('Nouns');
  });

  it('should allow minter to mint a noun to itself', async () => {
    await (await nounsToken.mint(30)).wait();

    const receipt = await (await nounsToken.mint(30)).wait();
    const nounCreated = receipt.events?.[3];

    expect(await nounsToken.ownerOf(2)).to.eq(deployer.address);
    expect(nounCreated?.event).to.eq('NounCreated');
    expect(nounCreated?.args?.tokenId).to.eq(2);
    expect(nounCreated?.args?.seed.length).to.equal(5);

    nounCreated?.args?.seed.forEach((item: EthersBN | number) => {
      const value = typeof item !== 'number' ? item?.toNumber() : item;
      expect(value).to.be.a('number');
    });
  });

  it('should emit two transfer logs on mint', async () => {
    const [, , creator, minter] = await ethers.getSigners();

    await (await nounsToken.mint(30)).wait();

    await (await nounsToken.setMinter(minter.address)).wait();
    await (await nounsToken.transferOwnership(creator.address)).wait();

    const tx = nounsToken.connect(minter).mint(30);

    await expect(tx)
      .to.emit(nounsToken, 'Transfer')
      .withArgs(constants.AddressZero, creator.address, 2);
    await expect(tx).to.emit(nounsToken, 'Transfer').withArgs(creator.address, minter.address, 2);
  });

  it('should allow minter to burn a noun', async () => {
    await (await nounsToken.mint(30)).wait();

    const tx = nounsToken.burn(0);
    await expect(tx).to.emit(nounsToken, 'NounBurned').withArgs(0);
  });

  it('should revert on non-minter mint', async () => {
    const account0AsNounErc721Account = nounsToken.connect(noundersDAO);
    await expect(account0AsNounErc721Account.mint(30)).to.be.reverted;
  });

  describe('contractURI', async () => {
    it('should return correct contractURI', async () => {
      expect(await nounsToken.contractURI()).to.eq(
        'ipfs://QmZi1n79FqWt2tTLwCqiy6nLM6xLGRsEPQ5JmReJQKNNzX',
      );
    });
    it('should allow owner to set contractURI', async () => {
      await nounsToken.setContractURIHash('ABC123');
      expect(await nounsToken.contractURI()).to.eq('ipfs://ABC123');
    });
    it('should not allow non owner to set contractURI', async () => {
      const [, nonOwner] = await ethers.getSigners();
      await expect(nounsToken.connect(nonOwner).setContractURIHash('BAD')).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  it('Should set correct opacity', async() => {
    const validateHeaderAndGetBody = (header: string, data: string) => {
      expect(data.indexOf(header)).eq(0);
      return Buffer.from(data.slice(header.length), 'base64').toString();
    }

    const opacities = [5, 34, 50];
    for(let i = 0; i < opacities.length; i++) {
      await nounsToken.mint(opacities[i]);
      const currentNounId = i + 1; // 1st mint generates 2 Nouns
      const dataBase64 = await nounsToken.dataURI(currentNounId);

      const dataJson = validateHeaderAndGetBody('data:application/json;base64,', dataBase64);
      const data = JSON.parse(dataJson);
      expect(data['name']).eq(`Ghost Noun ${currentNounId}`);
      expect(data['description']).eq(`Ghost Noun ${currentNounId} is a member of the Ghost Nouns`);
      expect(data['attributes'][0]['trait_type']).eq('Voted');
      expect(data['attributes'][0]['value']).eq(false);


      const svg = validateHeaderAndGetBody('data:image/svg+xml;base64,', data['image']);

      const numString = String(opacities[i]).padStart(2, '0');
      expect(svg.indexOf(`fill-opacity="0.${numString}`)).not.eq(-1)
    }
  })

  describe('vote', async () => {
    it('Should vote works', async() => {
      await (await nounsToken.mint(30)).wait();
      console.log(nounsToken.getVote(1))
      expect((await nounsToken.getVote(1)).valueOf()).eq(false)

      await (await nounsToken.setVote(1)).wait();
      expect((await nounsToken.getVote(1)).valueOf()).eq(true)

      await expect(nounsToken.connect(other).setVote(1)).to.be.revertedWith('Sender is not the minter');
    })

    it('Should vote reverted when the signer is not a minter', async() => {
      await expect(nounsToken.connect(other).setVote(1)).to.be.revertedWith('Sender is not the minter');
    })
  });
});
