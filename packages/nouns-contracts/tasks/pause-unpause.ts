import { task, types } from 'hardhat/config';


task('pause-unpause', 'pause or unpause the auction')
  .addFlag('unpause', 'unpause the auction (default is pause)')
  .addOptionalParam(
    'auctionHouseProxy',
    'The `auctionHouseProxy` contract address',
  )
  .setAction(async ({ unpause, auctionHouseProxy }, { ethers }) => {
    const auctionHouse = await ethers.getContractFactory("NounsAuctionHouse");
    const proxy = auctionHouse.attach(auctionHouseProxy)

    let result;
    if (unpause) {
      console.log('unpause the auction')
      result = await proxy.unpause({
        gasLimit: 1_000_000,
      })
    } else {
      console.log('pause the auction')
      result = await proxy.pause({
        gasLimit: 1_000_000,
      })
    }

    console.log(result)
  })