import { BigNumber, BigNumberish, ethers } from 'ethers';
import { HardhatEthersHelpers } from '@nomiclabs/hardhat-ethers/types';

const timer = (msec: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, msec);
  })
};

export const getGwei = (wei: BigNumberish): Number => {
  return Number(ethers.utils.formatUnits(wei, 'gwei'))
}

export const guaranteeGasPrice = async (ethers: HardhatEthersHelpers, guaranteedGasPrice: number, msec: number): Promise<BigNumber> => {
  let gasPrice = await ethers.provider.getGasPrice();
  while (getGwei(gasPrice) > guaranteedGasPrice) {
    console.log(`Curent gas price ${getGwei(gasPrice)} is larger than ${guaranteedGasPrice}`)
    await timer(msec);
    gasPrice = await ethers.provider.getGasPrice();
  }

  console.log(`Curent gas price: ${getGwei(gasPrice)}`);

  const GWEI = 1000000000;
  const p0 = BigNumber.from(guaranteedGasPrice * GWEI)
  const p1 = gasPrice.add(0.1 * GWEI)
  return p0.gt(p1) ? p1 : p0;
}