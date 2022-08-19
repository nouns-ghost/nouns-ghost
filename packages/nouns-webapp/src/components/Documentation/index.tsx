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
            Noun Ghosts?
          </h1>
          <p className={classes.aboutText}>
            Noun ghosts is a fork of {nounsLink}.
            Each noun ghost has an overcity proerty which makes the image looks like a ghost.
            The opacity is decided by the result of the votes.
            One noun ghost can be used for one vote. i.e. a noun ghost is a ticket for a vote.
          </p>
        </div>
      </Col>
    </Section>
    </div>
  );
};
export default Documentation;
