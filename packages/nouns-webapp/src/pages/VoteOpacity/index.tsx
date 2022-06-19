import { useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks';
import { useEthers, useContractFunction } from '@usedapp/core';
import { NounsAuctionHouseFactory } from '@nouns/sdk';
import { AuctionHouseContractFunction } from '../../wrappers/nounsAuction';
import { useNounToken, useTokenOfOwnerNotVoted } from '../../wrappers/nounToken';
import { connectContractToSigner } from '@usedapp/core/dist/cjs/src/hooks';
import { Button, DropdownButton, Form } from 'react-bootstrap';
import { BigNumber as EthersBN } from 'ethers';
import config from '../../config';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import Noun from '../../components/Noun';

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
      <>
      <Form>
        <Form.Check name="opacity" type="radio" id="0" label="10%" onChange={()=>{setSelectedOpacity(0)}} />
        <Form.Check name="opacity" type="radio" id="1" label="20%" onChange={()=>{setSelectedOpacity(1)}} />
        <Form.Check name="opacity" type="radio" id="2" label="30%" onChange={()=>{setSelectedOpacity(2)}} />
        <Form.Check name="opacity" type="radio" id="3" label="40%" onChange={()=>{setSelectedOpacity(3)}} />
        <Form.Check name="opacity" type="radio" id="4" label="50%" onChange={()=>{setSelectedOpacity(4)}} />
      </Form>
      </>
    )
  }

  return(
    <>
        <h1>Vote opacity!!</h1>
        <p>By consuming your noun, you can vote the opacity for the next mint! The nonuce is marked as "voted" and you cannot use it for vote.</p>
        <DropdownButton  title="Select your noun for vote" onSelect={onSelect}>
          {
            selection
          }
        </DropdownButton>
        <div style={{width: '100px'}}>
          <Noun imgPath={image} alt={description} />
        </div>
        {candidates()}
        <Button type="button" disabled={selectedOpacity == -1} onClick={async () =>{
            await doVote(selectedNoun, selectedOpacity);
        }}>vote</Button>
        <Button type="button" onClick={async () =>{
        }}>debug</Button>
    </>
  );
}