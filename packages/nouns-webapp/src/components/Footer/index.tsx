import classes from './Footer.module.css';
import { Container } from 'react-bootstrap';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import { externalURL, ExternalURL } from '../../utils/externalURL';
import config from '../../config';
import Link from '../Link';
import { Trans } from '@lingui/macro';

const Footer = () => {
  const openseaURL = externalURL(ExternalURL.opensea);
  const twitterURL = externalURL(ExternalURL.twitter);
  const githubURL = externalURL(ExternalURL.github);
  const etherscanURL = buildEtherscanAddressLink(config.addresses.nounsToken);

  return (
    <div className={classes.wrapper}>
      <Container className={classes.container}>
        <footer className={classes.footerSignature}>
          <Link text={<Trans>OpenSea</Trans>} url={openseaURL} leavesPage={true} />
          <Link text={<Trans>Twitter</Trans>} url={twitterURL} leavesPage={true} />
          <Link text={<Trans>GitHub</Trans>} url={githubURL} leavesPage={true} />
          <Link text={<Trans>Etherscan</Trans>} url={etherscanURL} leavesPage={true} />
        </footer>
      </Container>
    </div>
  );
};
export default Footer;
