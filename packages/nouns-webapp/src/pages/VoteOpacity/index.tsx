import { useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks';
import { useEthers, useContractFunction } from '@usedapp/core';
import { NounsAuctionHouseFactory } from '@nouns/sdk';
import { AuctionHouseContractFunction } from '../../wrappers/nounsAuction';
import { useNounToken, useTokenOfOwnerNotVoted } from '../../wrappers/nounToken';
import { connectContractToSigner } from '@usedapp/core/dist/cjs/src/hooks';
import { Button, DropdownButton, Form, Row, Col } from 'react-bootstrap';
import { BigNumber as EthersBN } from 'ethers';
import config from '../../config';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import Noun from '../../components/Noun';
import Section from '../../layout/Section';
import classes from './VoteOpacity.module.css';

export default function VoteOpacityPage() {
  const { library } = useEthers();
  const [ selectedNoun, setSelectedNoun] = useState(0);
  const [ selectedOpacity, setSelectedOpacity] = useState(-1);

  const activeAccount = useAppSelector(state => state.account.activeAccount);

  const nounsAuctionHouseContract = new NounsAuctionHouseFactory().attach(
    config.addresses.nounsAuctionHouseProxy,
  );

  const { send: vote, state: voteState } = useContractFunction(
    nounsAuctionHouseContract,
    AuctionHouseContractFunction.vote,
  );

  const doVote = async (nounId: number, opacityIndex: number) => {
    const contract = connectContractToSigner(nounsAuctionHouseContract, undefined, library);
    const gasLimit = await contract.estimateGas.vote(nounId, opacityIndex);
    vote(nounId, opacityIndex, {
      gasLimit: gasLimit.add(10_000), // A 10,000 gas pad is used to avoid 'Out of gas' errors
    });
  }

  let selection = [];

  const [nouns, size] = useTokenOfOwnerNotVoted(activeAccount!);
  if (size) {
    console.log(size);
    for(let i = 0; i < size.toNumber(); i++) {
      const id = nouns![i]!.toString();
      selection.push(<DropdownItem eventKey={id}>Noun {id}</DropdownItem>);
    }
  }

  const onSelect = (item: string|null) => {
    console.log(item);
    if(item){
      setSelectedNoun(parseInt(item));
    }
  }

  const nounToken = useNounToken(EthersBN.from(selectedNoun));
  const {image, description} = (selectedNoun !== 0 && nounToken) ? nounToken : {image:'', description:''};

  const candidates = () => {
    return(
      <Form className={classes.voteOption}>
        <Form.Check name="opacity" type="radio" id="0" label="10%" onChange={()=>{setSelectedOpacity(0)}} />
        <Form.Check name="opacity" type="radio" id="1" label="20%" onChange={()=>{setSelectedOpacity(1)}} />
        <Form.Check name="opacity" type="radio" id="2" label="30%" onChange={()=>{setSelectedOpacity(2)}} />
        <Form.Check name="opacity" type="radio" id="3" label="40%" onChange={()=>{setSelectedOpacity(3)}} />
        <Form.Check name="opacity" type="radio" id="4" label="50%" onChange={()=>{setSelectedOpacity(4)}} />
      </Form>
    )
  }

  return(
    <Section fullWidth={false} >
      <Row>
        <h1 className={classes.headerWrapper}>Let's Vote opacity!</h1>
      </Row>
      <Row>
        <p>
          By consuming your noun, you can vote the opacity for the next mint!<br/>
          Pleae note that consumed nonuce is marked as "voted" and you cannot reuse it for vote any more. But no worries, the noun is still yours.
        </p>
      </Row>
      <Row>
        <DropdownButton title="Select your noun to vote" onSelect={onSelect} size="lg">
          {
            selection
          }
        </DropdownButton>
      </Row>
      <Row>
        <Col>
          <div style={{width: '300px'}}>
            <Noun imgPath={image} alt={description} />
          </div>
        </Col>
        <Col>
          <Row>
            <div>Select the opacity below</div>
            {candidates()}
          </Row>
          <Row>
            <Button type="button"
             className={classes.voteBtn}
             disabled={selectedOpacity == -1} onClick={async () =>{
                await doVote(selectedNoun, selectedOpacity);
            }}>
              Vote!
            </Button>
          </Row>
        </Col>
      </Row>
    </Section>
  );
}