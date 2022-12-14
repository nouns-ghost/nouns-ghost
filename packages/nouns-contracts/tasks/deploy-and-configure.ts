import { task, types } from 'hardhat/config';
import { DeployedContract } from './types';

interface ContractRow {
  Address: string;
  'Deployment Hash'?: string;
}

task('deploy-and-configure', 'Deploy and configure all contracts')
  .addFlag('startAuction', 'Start the first auction upon deployment completion')
  .addFlag('autoDeploy', 'Deploy all contracts without user interaction')
  .addFlag('updateConfigs', 'Write the deployed addresses to the SDK and subgraph configs')
  .addOptionalParam('weth', 'The WETH contract address')
  .addOptionalParam('noundersdao', 'The nounders DAO contract address')
  .addOptionalParam('auctionTimeBuffer', 'The auction time buffer (seconds)')
  .addOptionalParam('auctionReservePrice', 'The auction reserve price (wei)')
  .addOptionalParam(
    'auctionMinIncrementBidPercentage',
    'The auction min increment bid percentage (out of 100)',
  )
  .addOptionalParam('auctionDuration', 'The auction duration (seconds)')
  .addOptionalParam(
    'guaranteedGasPrice',
    'Wait until the gas prices is less than the limit',
    2.5,
    types.float
  )
  .setAction(async (args, { run }) => {
    // Deploy the Nouns DAO contracts and return deployment information
    const contracts = await run('deploy', args);

    // Verify the contracts on Etherscan
    await run('verify-etherscan', {
      contracts,
    });

    // Populate the on-chain art
    await run('populate-descriptor', {
      autoDeploy: args.autoDeploy,
      nftDescriptor: contracts.NFTDescriptor.address,
      nounsDescriptor: contracts.NounsDescriptor.address,
      guaranteedGasPrice: args.guaranteedGasPrice,
    });

    // Optionally kick off the first auction and transfer ownership of the auction house
    // to the Nouns DAO executor.
    if (args.startAuction) {
      const auctionHouse = contracts.NounsAuctionHouse.instance.attach(
        contracts.NounsAuctionHouseProxy.address,
      );
      await auctionHouse.unpause({
        gasLimit: 1_000_000,
      });
      console.log(
        'Started the first auction and transferred ownership of the auction house to the executor.',
      );
    }

    // Optionally write the deployed addresses to the SDK and subgraph configs.
    if (args.updateConfigs) {
      await run('update-configs', {
        contracts,
      });
    }

    console.table(
      Object.values<DeployedContract>(contracts).reduce(
        (acc: Record<string, ContractRow>, contract: DeployedContract) => {
          acc[contract.name] = {
            Address: contract.address,
          };
          if (contract.instance?.deployTransaction) {
            acc[contract.name]['Deployment Hash'] = contract.instance.deployTransaction.hash;
          }
          return acc;
        },
        {},
      ),
    );
    console.log('Deployment Complete.');
  });
