import { task, types } from 'hardhat/config';
import ImageData from '../files/image-data.json';
import { chunkArray } from '../utils';
import { BigNumber, ContractTransaction } from 'ethers';
import promptjs from 'prompt';


task('populate-descriptor', 'Populates the descriptor with color palettes and Noun parts')
  .addFlag('autoDeploy', 'Deploy all contracts without user interaction')
  .addOptionalParam(
    'nftDescriptor',
    'The `NFTDescriptor` contract address',
    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    types.string,
  )
  .addOptionalParam(
    'nounsDescriptor',
    'The `NounsDescriptor` contract address',
    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    types.string,
  )
  .setAction(async ({ autoDeploy, nftDescriptor, nounsDescriptor }, { ethers }) => {
    const printConstResult = async(tx: ContractTransaction) => {
      const receipt = await ethers.provider.waitForTransaction(tx.hash)
      const fee = tx.gasPrice!.mul(receipt.gasUsed.toBigInt())
      console.log(`    ${txResult.hash}, gasPrice: ${ethers.utils.formatUnits(tx.gasPrice!, 'gwei')}, fee: ${ethers.utils.formatUnits(fee, 'ether')}`)

    }

    const confirmGasPrice = async(gasPrice: BigNumber): Promise<BigNumber> => {
        //const gasInGwei = Math.round(Number(ethers.utils.formatUnits(gasPrice, 'gwei')));
        const gasInGwei = Number(ethers.utils.formatUnits(gasPrice, 'gwei'));

        promptjs.start();

        const result = await promptjs.get([
          {
            properties: {
              gasPrice: {
                type: 'number',
                required: true,
                description: 'Enter a gas price (gwei)',
                default: gasInGwei,
              },
            },
          },
        ]);
        return ethers.utils.parseUnits(result.gasPrice.toString(), 'gwei');
    }

    const descriptorFactory = await ethers.getContractFactory('NounsDescriptor', {
      libraries: {
        NFTDescriptor: nftDescriptor,
      },
    });
    const descriptorContract = descriptorFactory.attach(nounsDescriptor);

    const { bgcolors, palette, images } = ImageData;
    const { bodies, accessories, heads, glasses } = images;

    // Chunk head and accessory population due to high gas usage
    let txResult: ContractTransaction;
    let gasPrice: BigNumber;

    console.log('## addManyBackgrounds')
    gasPrice = await ethers.provider.getGasPrice();
    if (!autoDeploy) {
      gasPrice = await confirmGasPrice(gasPrice);
    }
    txResult = await descriptorContract.addManyBackgrounds(bgcolors, {gasPrice});
    await printConstResult(txResult)

    console.log('## addManyColorsToPalette')
    gasPrice = await ethers.provider.getGasPrice();
    if (!autoDeploy) {
      gasPrice = await confirmGasPrice(gasPrice);
    }
    txResult = await descriptorContract.addManyColorsToPalette(0, palette, {gasPrice});
    await printConstResult(txResult)

    console.log('## addManyBodies')
    gasPrice = await ethers.provider.getGasPrice();
    if (!autoDeploy) {
      gasPrice = await confirmGasPrice(gasPrice);
    }
    txResult = await descriptorContract.addManyBodies(bodies.map(({ data }) => data), {gasPrice});
    await printConstResult(txResult)

    console.log('## addManyAccessories')
    const accessoryChunk = chunkArray(accessories, 10);
    for (let i = 0; i < accessoryChunk.length; i++) {
      gasPrice = await ethers.provider.getGasPrice();
      if (!autoDeploy) {
        gasPrice = await confirmGasPrice(gasPrice);
      }
      txResult = await descriptorContract.addManyAccessories(accessoryChunk[i].map(({ data }) => data), {gasPrice});
      console.log(`### chunk=${i}`)
      await printConstResult(txResult)
    }

    console.log('## addManyHeads')
    const headChunk = chunkArray(heads, 10);
    for (let i = 0; i< headChunk.length; i++) {
      gasPrice = await ethers.provider.getGasPrice();
      if (!autoDeploy) {
        gasPrice = await confirmGasPrice(gasPrice);
      }
      txResult = await descriptorContract.addManyHeads(headChunk[i].map(({ data }) => data), {gasPrice});
      console.log(`### chunk=${i}`)
      await printConstResult(txResult)
    }

    console.log('## addManyGlasses')
    gasPrice = await ethers.provider.getGasPrice();
    if (!autoDeploy) {
      gasPrice = await confirmGasPrice(gasPrice);
    }
    txResult = await descriptorContract.addManyGlasses(glasses.map(({ data }) => data), {gasPrice});
    await printConstResult(txResult)

    console.log('Descriptor populated with palettes and parts.');
  });
