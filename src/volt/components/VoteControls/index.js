import React, { Component } from "react";
import Web3 from "web3";
import { Tx, Input, Output, helpers } from "leap-core";
import { providers, utils } from "ethers";
import SMT from "../../lib/SparseMerkleTree";
import { getStoredValue, storeValues } from "../../../services/localStorage";

import voteBoothInterface from "../../contracts/voteBooth";
import ballotBoxInterface from "../../contracts/ballotBox";

import { Equation } from "./GridDisplay";
import { Choice } from "./Choice";
import {
  SliderLabels,
  Container,
  Label,
  StyledSlider,
  ActionButton
} from "./styles";

import {
  getUTXOs,
  toHex,
  padHex,
  replaceAll,
  generateProposal,
  gte,
  randomItem,
} from "../../utils";
import { voltConfig } from "../../config";
import { getId } from "../../../services/plasma";
import Progress from "../Progress";
import Receipt from "../Receipt";

const RPC = "https://testnet-node1.leapdao.org";
const plasma = new providers.JsonRpcProvider(RPC);

class VoteControls extends Component {
  constructor(props) {
    super(props);

    this.collapse = this.collapse.bind(this);
    this.expand = this.expand.bind(this);
    this.setProgressState = this.setProgressState.bind(this);
    this.setReceiptState = this.setReceiptState.bind(this);
    this.resetState = this.resetState.bind(this);

    this.setTokenNumber = this.setTokenNumber.bind(this);
    this.setChoice = this.setChoice.bind(this);

    this.prepareScript = this.prepareScript.bind(this);
    this.getOutputs = this.getOutputs.bind(this);
    this.cookVoteParams = this.cookVoteParams.bind(this);
    this.constructVote = this.constructVote.bind(this);
    this.signVote = this.signVote.bind(this);
    this.processTransaction = this.processTransaction.bind(this);

    // Withdraw methods
    this.prepareWithdrawScript = this.prepareWithdrawScript.bind(this);
    this.getWithdrawOutputs = this.getWithdrawOutputs.bind(this);
    this.cookWithdrawParams = this.cookWithdrawParams.bind(this);
    this.signWithdraw = this.signWithdraw.bind(this);

    this.getDataFromTree = this.getDataFromTree.bind(this);
    this.writeDataToTree = this.writeDataToTree.bind(this);

    this.submitVote = this.submitVote.bind(this);
    this.withdrawVote = this.withdrawVote.bind(this);

    this.storeVotingAction = this.storeVotingAction.bind(this);

    const treeData = this.getDataFromTree();
    this.state = {
      expanded: false,
      votes: 0,
      choice: "",
      showProgress: false,
      showReceipt: false,
      ...treeData
    };
  }

  setTokenNumber(event) {
    const { target } = event;
    this.setState(state => ({
      ...state,
      votes: target.value
    }));
  }

  setChoice({ value }) {
    this.setState(state => ({
      ...state,
      choice: value
    }));
  }

  prepareScript() {
    const { proposal } = this.props;
    const { boothAddress, yesBoxAddress, noBoxAddress, id } = proposal;
    console.log({ boothAddress, yesBoxAddress, noBoxAddress });
    const motionId = proposal.id;
    console.log({ motionId });

    const params = generateProposal(motionId);
    console.log({ params });
    if ( boothAddress !== params.booth.address ){
      throw Error("Spendie contract code versions out of sync ");
    }

    return Buffer.from(params.booth.code.replace("0x", ""), "hex");
  }

  async getBalanceCard(address) {
    // Balance Card
    const { BALANCE_CARD_COLOR } = voltConfig;
    const balanceCards = await getUTXOs(plasma, address, BALANCE_CARD_COLOR);
    const balanceCard = balanceCards[0];

    return {
      id: getId(balanceCard),
      unspent: balanceCard
    };
  }

  async getVoteCredits(address) {
    const { VOICE_CREDITS_COLOR } = voltConfig;
    const voiceCreditsUTXOs = await getUTXOs(
      plasma,
      address,
      VOICE_CREDITS_COLOR
    );

    // TODO: We can put all UTXO here for consolidation
    return {
      unspent: [voiceCreditsUTXOs[0]],
      all: voiceCreditsUTXOs
    };
  }

  async getGas(address) {
    // Gas is always paid in Leap tokens (color = 0)
    const LEAP_COLOR = 0;
    const { MIN_SIZE_FOR_LEAP_UTXO } = voltConfig;
    const gasUTXOs = await getUTXOs(plasma, address, LEAP_COLOR);

    console.log({ gasUTXOs });

    // Assumptions:
    // 1. BallotBox and VotingBooth spendies contain multiple big-enough
    //    UTXOs for LEAP (done by consolidation script)
    const gas = randomItem(gasUTXOs.filter(gte(MIN_SIZE_FOR_LEAP_UTXO)));
    console.log({ gas });
    return {
      unspent: gas
    };
  }

  async getVoteTokens(address) {
    console.log("Get vote tokens from:", address);
    const { VOICE_TOKENS_COLOR, MIN_SIZE_FOR_VOT_UTXO } = voltConfig;
    const voiceTokensUTXOs = await getUTXOs(
      plasma,
      address,
      VOICE_TOKENS_COLOR
    );

    console.log({ voiceTokensUTXOs });

    // Assumptions:
    // 1. BallotBox and VotingBooth spendies contain multiple big-enough
    //    UTXOs for VOT (done by consolidation script)
    // 2. Each voter can cast/withdraw MIN_SIZE_FOR_VOT_UTXO votes at most
    const voiceTokensOutput = randomItem(
      voiceTokensUTXOs.filter(gte(MIN_SIZE_FOR_VOT_UTXO))
    );

    console.log({ voiceTokensOutput });

    return {
      unspent: [voiceTokensOutput],
      all: voiceTokensUTXOs
    };
  }

  async getOutputs() {
    const { account, proposal } = this.props;
    const { boothAddress } = proposal;
    // TODO: Parallelize with Promise.all([...promises])
    const gas = await this.getGas(boothAddress);
    const voteTokens = await this.getVoteTokens(boothAddress);
    const balanceCard = await this.getBalanceCard(account);
    const voteCredits = await this.getVoteCredits(account);

    return {
      gas,
      voteTokens,
      balanceCard,
      voteCredits
    };
  }

  getDataFromTree() {
    const { account, proposal } = this.props;
    const motionId = proposal.id;
    console.log({ motionId });

    let tree;
    let castedVotes;
    let localTree = getStoredValue("votes", account);

    if (!localTree) {
      console.log("local tree is empty");
      tree = new SMT(9);
      castedVotes = 0;
    } else {
      const parsedTree = JSON.parse(localTree);
      console.log({ parsedTree });
      tree = new SMT(9, parsedTree);
      castedVotes = utils.formatEther(parsedTree[motionId] || 0);
    }
    const proof = tree.createMerkleProof(motionId);

    console.log({ castedVotes, proof });

    return {
      root: tree.root,
      proof,
      castedVotes
    };
  }

  writeDataToTree(castedVotes, newLeaf) {
    const { account, proposal } = this.props;
    const motionId = proposal.id;
    const localTree = getStoredValue("votes", account);
    let parsedTree = JSON.parse(localTree);
    if (!parsedTree) {
      parsedTree = {};
      storeValues(parsedTree, account);
    }
    parsedTree[motionId] = padHex(newLeaf.toHexString(), 64);

    console.log({ castedVotes, newLeaf });
    console.log({ parsedTree });

    storeValues({ votes: JSON.stringify(parsedTree) }, account);

    const tree = new SMT(9, parsedTree);
    const proof = tree.createMerkleProof(motionId);

    this.setState(state => ({
      ...state,
      proof,
      castedVotes
    }));
  }

  cookVoteParams(balanceCardId, prevVotes, newVotes) {
    const { proof } = this.state;

    const { abi } = voteBoothInterface;
    const contractInterface = new utils.Interface(abi);

    return contractInterface.functions.castBallot.encode([
      utils.bigNumberify(balanceCardId),
      proof,
      prevVotes, // previous value
      newVotes // how much added
    ]);
  }

  async constructVote(outputs, script, data) {
    const { gas, voteTokens, voteCredits, balanceCard } = outputs;

    const mapInput = utxo => new Input({ prevout: utxo.outpoint });

    const voteCreditsInputs = voteCredits.unspent.map(mapInput);
    const voteTokensInputs = voteTokens.unspent.map(mapInput);

    const vote = Tx.spendCond(
      [
        new Input({
          prevout: gas.unspent.outpoint,
          script
        }),
        new Input({
          prevout: balanceCard.unspent.outpoint
        }),
        ...voteCreditsInputs,
        ...voteTokensInputs
      ],
      // Outputs is empty, cause it's hard to guess what it should be
      []
    );

    vote.inputs[0].setMsgData(data);
    return vote;
  }

  async signVote(vote, voiceInputs) {
    const { metaAccount, web3 } = this.props;
    const numOfInputs = vote.inputs.length;

    if (metaAccount && metaAccount.privateKey) {
      const privateKeys = [];
      for (let i = 0; i < numOfInputs; i++) {
        if (i > 0 && i < voiceInputs) {
          privateKeys.push(metaAccount.privateKey);
        } else {
          privateKeys.push(null);
        }
      }
      vote.sign(privateKeys);
    } else {
      await window.ethereum.enable();
      const { r, s, v, signer } = await Tx.signMessageWithWeb3(web3, vote.sigData(), 0);
      for (let i = 0; i < numOfInputs; i++) {
        if (i === 1) {
          vote.inputs[i].setSig(r, s, v, signer);
        }
      }
    }
  }

  async signWithdraw(withdraw) {
    const { metaAccount, web3 } = this.props;

    if (metaAccount && metaAccount.privateKey) {
      const numOfInputs = withdraw.inputs.length;
      const privateKeys = [];
      for (let i = 0; i < numOfInputs; i++) {
        if (i === 1) {
          privateKeys.push(metaAccount.privateKey);
        } else {
          privateKeys.push(null);
        }
      }
      withdraw.sign(privateKeys);
    } else {
      await window.ethereum.enable();
      const { r, s, v, signer } = await Tx.signMessageWithWeb3(web3, withdraw.sigData(), 0);
      withdraw.inputs[1].setSig(r, s, v, signer);
    }
  }

  async checkCondition(spendie) {
    return await plasma.send("checkSpendingCondition", [spendie.hex()]);
  }

  async processTransaction(tx) {
    const plasmaWeb3 = helpers.extendWeb3(new Web3(RPC));
    const receipt = await plasmaWeb3.eth.sendSignedTransaction(tx.hex());
    return receipt;
  }

  async submitVote() {
    const { changeAlert } = this.props;
    const {votes, choice, castedVotes} = this.state;
    try {
      console.log("Display Progress Screen");
      console.log({choice});
      this.setProgressState(true);

      /// START NEW CODE

      const script = this.prepareScript();
      const outputs = await this.getOutputs();
      const {balanceCard} = outputs;

      const treeData = this.getDataFromTree();

      if (balanceCard.unspent.output.data !== treeData.root){
        throw Error(`local Storage and balance card out of sync: ${balanceCard.unspent.output.data} / ${treeData.root}`);
      }

      const sign = choice === "yes" ? 1 : -1;

      const prevNumOfVotes = utils.parseEther(castedVotes.toString());
      const newVotesTotal = Math.abs(parseInt(castedVotes)) + parseInt(votes);
      const newNumOfVotes = utils.parseEther((sign * newVotesTotal).toString());

      console.log({castedVotes, newVotesTotal, newNumOfVotes});

      const data = this.cookVoteParams(
        balanceCard.id,
        prevNumOfVotes,
        newNumOfVotes
      );
      const vote = await this.constructVote(outputs, script, data);
      console.log({vote});

      const privateOutputs = outputs.voteCredits.unspent.length;
      await this.signVote(vote, privateOutputs);
      const check = await this.checkCondition(vote);

      // Update vote and sign again
      vote.outputs = check.outputs.map(Output.fromJSON);
      await this.signVote(vote, privateOutputs);

      const secondCheck = await this.checkCondition(vote);
      console.log({secondCheck});

      // Submit vote to blockchain
      const receipt = await this.processTransaction(vote);
      console.log({receipt});
      this.writeDataToTree(newVotesTotal, newNumOfVotes);

      // Store voting action in history
      this.storeVotingAction({
        type: "cast",
        votes: sign * newVotesTotal,
        balanceCard,
      });

      this.setProgressState(false);
      this.setReceiptState(true);
    } catch (error) {
      console.error(error);
      changeAlert({
        type: "fail",
        message: error.message
      })
    }
  }

  // WITHDRAW RELATED METHODS

  prepareWithdrawScript() {
    const { proposal } = this.props;
    const { castedVotes } = this.state;
    const { yesBoxAddress, noBoxAddress, } = proposal;
    const motionId = proposal.id;
    console.log({ yesBoxAddress, noBoxAddress });

    const params = generateProposal(motionId);
    if (yesBoxAddress !== params.yes.address || noBoxAddress !== params.no.address){
      throw Error("Spendies contract code is out of sync");
    }

    // TODO: Make proper comparison to allow votes with decimal places
    const destBox = castedVotes < 0 ? params.no : params.yes;

    return Buffer.from(destBox.code.replace("0x", ""), "hex");
  }

  async getWithdrawOutputs() {
    const { account, proposal } = this.props;
    const { castedVotes } = this.state;

    const { yesBoxAddress, noBoxAddress } = proposal;
    const destBox = castedVotes < 0 ? noBoxAddress : yesBoxAddress;

    console.log({ destBox });

    const gas = await this.getGas(destBox);
    const voteTokens = await this.getVoteTokens(destBox);
    const voteCredits = await this.getVoteCredits(destBox);
    const balanceCard = await this.getBalanceCard(account);

    return {
      gas,
      voteTokens,
      balanceCard,
      voteCredits
    };
  }

  cookWithdrawParams(balanceCardId, amount) {
    const { proof } = this.state;
    const { abi } = ballotBoxInterface;
    const contractInterface = new utils.Interface(abi);

    // const amount = utils.parseEther("3");

    return contractInterface.functions.withdraw.encode([
      utils.bigNumberify(balanceCardId),
      proof,
      amount,
      amount
    ]);
  }

  async constructWithdraw(outputs, script, data) {
    const { gas, voteTokens, voteCredits, balanceCard } = outputs;

    const mapInput = utxo => new Input({ prevout: utxo.outpoint });

    const voteTokensInputs = voteTokens.unspent.map(mapInput);
    const voteCreditsInputs = voteCredits.unspent.map(mapInput);

    console.log({ voteTokensInputs, voteCreditsInputs });

    const inputs = [
      new Input({
        prevout: gas.unspent.outpoint,
        script
      }),
      new Input({
        prevout: balanceCard.unspent.outpoint
      }),
      ...voteTokensInputs,
      ...voteCreditsInputs
    ];

    const withdraw = Tx.spendCond(
      inputs,
      // Outputs is empty, cause it's hard to guess what it should be
      []
    );

    withdraw.inputs[0].setMsgData(data);
    return withdraw;
  }

  async withdrawVote() {
    const { changeAlert } = this.props;
    const { castedVotes } = this.state;

    try {
      this.setProgressState(true);

      // WITHDRAW CODE HERE
      const script = this.prepareWithdrawScript();
      const outputs = await this.getWithdrawOutputs();
      const {balanceCard} = outputs;

      const treeData = this.getDataFromTree();
      console.log({treeData});

      const votes = castedVotes.toString();
      const currentVotes = utils.parseEther(votes);

      const data = this.cookWithdrawParams(balanceCard.id, currentVotes);

      const withdraw = await this.constructWithdraw(outputs, script, data);

      console.log({withdraw});

      //await this.signVote(withdraw);

      await this.signWithdraw(withdraw);
      const check = await this.checkCondition(withdraw);

      console.log({check});
      withdraw.outputs = check.outputs.map(o => new Output(o));
      await this.signWithdraw(withdraw);

      const secondCheck = await this.checkCondition(withdraw);
      console.log({secondCheck});

      const zeroVotes = utils.parseEther("0");

      // Process withdrawal
      const receipt = await this.processTransaction(withdraw);
      console.log({receipt});

      this.writeDataToTree(0, zeroVotes);

      // Store voting action in history
      this.storeVotingAction({
        type: "withdraw",
        votes,
        balanceCard,
      });

      this.setProgressState(false);
      this.setReceiptState(true);

    } catch (error) {
      console.error(error);
      changeAlert({
        type: "fail",
        message: error.message
      })
    }
  }

  setProgressState(bool) {
    this.setState(state => ({
      ...state,
      showProgress: bool
    }));
  }

  setReceiptState(bool) {
    this.setState(state => ({
      ...state,
      showReceipt: bool
    }));
  }

  resetState() {
    this.setState(() => ({
      expanded: false,
      votes: 0,
      choice: "",
      showProgress: false,
      showReceipt: false
    }));
  }

  collapse() {
    this.setState(state => {
      return {
        ...state,
        expanded: false
      };
    });
  }

  expand() {
    this.setState(state => {
      return {
        ...state,
        expand: true
      };
    });
  }

  storeVotingAction(params){
    const { account , proposal } = this.props;
    const { proposalId } = proposal;
    const { type, votes, balanceCard } = params;
    const timestamp = new Date();

    // TODO: We shall use balance card id, but needed quick solution
    // const { id } = balanceCard;
    const id = account;

    const prevValues = getStoredValue("votesHistory", id);
    const parsedHistory = prevValues ? JSON.parse(prevValues) : [];
    parsedHistory.push({
      type,
      votes,
      proposalId,
      timestamp
    });
    const history = JSON.stringify(parsedHistory);

    storeValues({history}, id);
  }

  render() {
    const { expanded, votes, choice } = this.state;
    const { showReceipt, showProgress } = this.state;
    const { credits } = this.props;
    const max = Math.floor(Math.sqrt(credits)) || 0;
    const options = [
      { value: "yes", color: "voltBrandGreen" },
      { value: "no", color: "voltBrandRed" }
    ];
    const disabled = votes < 1 || choice === "";

    return (
      <Container>
        {showProgress && <Progress message={"Processing, please wait..."} />}
        {showReceipt && (
          <Receipt voteType={choice} votes={votes} onClose={this.resetState} />
        )}
        <Equation votes={votes} />
        <StyledSlider
          min={0}
          max={Math.max(max, 1)}
          steps={max + 1}
          value={votes}
          onChange={this.setTokenNumber}
        />
        <SliderLabels>
          <Label>0</Label>
          <Label>{max}</Label>
        </SliderLabels>
        <Choice
          options={options}
          selection={choice}
          onChange={this.setChoice}
        />
        <ActionButton disabled={disabled} onClick={this.submitVote}>
          Send Vote
        </ActionButton>
        <ActionButton onClick={this.withdrawVote}>Withdraw</ActionButton>
      </Container>
    );
  }
}

export default VoteControls;
