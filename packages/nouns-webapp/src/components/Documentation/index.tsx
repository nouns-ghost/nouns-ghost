import Section from '../../layout/Section';
import { Col } from 'react-bootstrap';
import classes from './Documentation.module.css';
import Accordion from 'react-bootstrap/Accordion';
import Link from '../Link';

const Documentation = () => {
  const nounsLink = (
    <Link
      text="Nouns"
      url="https://nouns.wtf/"
      leavesPage={true}
    />
  );
  const publicDomainLink = (
    <Link
      text="public domain"
      url="https://creativecommons.org/publicdomain/zero/1.0/"
      leavesPage={true}
    />
  );
  return (
    <div className={classes.body} style={{backgroundColor: "#404455"}}>
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
          <Accordion flush>
          <Accordion.Item eventKey="0" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              Summary
            </Accordion.Header>
            <Accordion.Body>
              <ul>
                <li>
                  Ghost Nouns artwork is in the {publicDomainLink}, taking over Nouns DAO's policy.
                </li>
                <li>
                  One Noun is trustlessly auctioned every 24 hours, forever.
                </li>
                <li>
                  Settlement of one auction kicks off the next.
                </li>
                <li>
                  One Ghost Noun is equal to one vote inorder to decide next opacity.
                </li>
                <li>
                  Artwork is generative and stored directly on-chain (not IPFS).
                </li>
                <li>
                  Operator does NOT receive reward Ghost Nouns except for id == 0.
                </li>
              </ul>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              Daily Auctions
            </Accordion.Header>
            <Accordion.Body>
              <p className={classes.aboutText}>
                The Ghost Nouns Auction Contract will act as a self-sufficient Ghost Noun generation and
                distribution mechanism, auctioning one Noun every 24 hours, forever. 100% of
                auction proceeds (ETH) are automatically deposited in the operator's wallet. 
              </p>

              <p className={classes.aboutText}>
                Each time an auction is settled, the settlement transaction will also cause a new
                Ghost Noun to be minted and a new 24 hour auction to begin.{' '}
              </p>
              <p>
                While settlement is most heavily incentivized for the winning bidder, it can be
                triggered by anyone, allowing the system to trustlessly auction Ghost Nouns as long as
                Ethereum is operational and there are interested bidders.
              </p>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="2" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              Ghost Noun Traits
            </Accordion.Header>
            <Accordion.Body>
              <p>
                Ghost Nouns are generated randomly based Ethereum block hashes. There are no 'if'
                statements or other rules governing Ghost Noun trait scarcity, which makes all Ghost Nouns
                equally rare. As of this writing, Ghost Nouns are made up of:
              </p>
              <ul>
                <li>
                  backgrounds (2)
                </li>
                <li>
                  bodies (30)
                </li>
                <li>
                  accessories (137)
                </li>
                <li>
                  heads (234)
                </li>
                <li>
                  glasses (21)
                </li>
              </ul>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="3" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              On-Chain Artwork
            </Accordion.Header>
            <Accordion.Body>
              <p>
                Ghost Nouns are stored directly on Ethereum and do not utilize pointers to other
                networks such as IPFS. This is possible because Ghost Noun parts are compressed and
                stored on-chain using a custom run-length encoding (RLE), which is a form of
                lossless compression.
              </p>

              <p>
                The compressed parts are efficiently converted into a single base64 encoded SVG
                image on-chain. To accomplish this, each part is decoded into an intermediate
                format before being converted into a series of SVG rects using batched, on-chain
                string concatenation. Once the entire SVG has been generated, it is base64
                encoded.
              </p>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="4" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              Ghost Noun Seeder Contract
            </Accordion.Header>
            <Accordion.Body>
              <p>
                The Ghost Noun Seeder contract is used to determine Ghost Noun traits during the minting
                process. The seeder contract can be replaced to allow for future trait generation
                algorithm upgrades. Additionally, it can be locked by the the operator to prevent any
                future updates. Currently, Ghost Noun traits are determined using pseudo-random number
                generation:
              </p>
              <code>keccak256(abi.encodePacked(blockhash(block.number - 1), nounId))</code>
              <br />
              <br />
              <p>
                Trait generation is not truly random. Traits can be predicted when minting a Ghost Noun
                on the pending block.
              </p>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="5" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              Operator's Reward
            </Accordion.Header>
            <Accordion.Body>
              <p>
                The payed ETH is sent to the operator's wallet and it's used to compensate for the operation cost.
              </p>
              <p>
                On the contrary, the operator does not receive Ghost Nouns as rewards except for id == 0.
              </p>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="6" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              Which opacities are available?
            </Accordion.Header>
            <Accordion.Body>
              <p>
                It's predefined; 5%, 10%, 20% 30% and 40%. If there's no vote, 40% is the default.
              </p>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="7" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              How "voting" works?
            </Accordion.Header>
            <Accordion.Body>
              <p>
                On each auction starts, the vote is reset. When the vote is a tie, the largest opacity is selected.
              </p>
              <p>
                Imagine that there is an internal array named opacity and the values are [0, 0, 0, 0, 0].
                Each number represents the number of votes for 5%, 10%, 20%, 30% and 40%.
                For instance, Alice voted 5% and Bob voted 10%. Now, if you vote 30%, it's a tie. In this case, 30% is used for the next auction.
                If you vote 5%, 5% is used for the next auction.
              </p>
              <p>
                The drop down menue in the voting page lists Ghost Nouns which are not used yet. Once you use a Ghost Noun, it won't be listed later on.
              </p>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
    </Section>
    </div>
  );
};
export default Documentation;
