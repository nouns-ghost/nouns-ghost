import { BigNumber } from 'ethers';
import classes from './AuctionActivityNounTitle.module.css';

const AuctionActivityNounTitle: React.FC<{ nounId: BigNumber; opacity: number; isCool?: boolean }> = props => {
  const { nounId, opacity, isCool } = props;
  return (
    <div className={classes.wrapper}>
      <h1 style={{ color: isCool ? 'var(--brand-cool-dark-text)' : 'var(--brand-warm-dark-text)' }}>
        Ghost Noun {nounId.toString()}
      </h1>
      <h2>
        Opacity: {opacity}%
      </h2>
    </div>
  );
};
export default AuctionActivityNounTitle;
