import Section from '../../layout/Section';
import { Col } from 'react-bootstrap';
import classes from './Documentation.module.css';
import Link from '../Link';
import { Trans } from '@lingui/macro';

const Documentation = () => {
  const nounsLink = (
    <Link
      text={<Trans>Nouns</Trans>}
      url="https://nouns.wtf/"
      leavesPage={true}
    />
  );
  return (
    <div style={{backgroundColor: "#404455"}}>
    <Section fullWidth={false}>
      <Col lg={{ span: 10, offset: 1 }}>
        <div className={classes.headerWrapper}>
          <h1>
            Ghost Nouns?
          </h1>
          <p className={classes.aboutText}>
            "Ghost Nouns" is a fork of {nounsLink}.
            Each ghost noun has an opacity property which makes the image looks like a ghost.
            The opacity is decided by the result of the votes.
            One ghost noun can be used for one vote. i.e. a ghost noun is a ticket for a vote.
          </p>
        </div>
      </Col>
    </Section>
    </div>
  );
};
export default Documentation;
