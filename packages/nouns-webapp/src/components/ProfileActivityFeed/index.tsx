import React from 'react';
import { Col } from 'react-bootstrap';
import Section from '../../layout/Section';
import classes from './ProfileActivityFeed.module.css';

import { useQuery } from '@apollo/client';
import { nounVotingHistoryQuery } from '../../wrappers/subgraph';

import { Trans } from '@lingui/macro';

interface ProfileActivityFeedProps {
  nounId: number;
}

interface ProposalInfo {
  id: number;
}

export interface NounVoteHistory {
  proposal: ProposalInfo;
  support: boolean;
  supportDetailed: number;
}

const ProfileActivityFeed: React.FC<ProfileActivityFeedProps> = props => {
  const { nounId } = props;

  const { loading, error } = useQuery(nounVotingHistoryQuery(nounId));

  if (loading) {
    return <></>;
  } else if (error) {
    return (
      <div>
        <Trans>Failed to fetch Noun activity history</Trans>
      </div>
    );
  }

  return (
    <Section fullWidth={false}>
      <Col lg={{ span: 10, offset: 1 }}>
        <div className={classes.headerWrapper}>
          <h1>
            <Trans>Activity</Trans>
          </h1>
        </div>
      </Col>
    </Section>
  );
};

export default ProfileActivityFeed;
