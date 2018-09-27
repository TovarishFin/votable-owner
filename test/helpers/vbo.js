const {
  tempOwner,
  voters,
  tokenHolders,
  sendTransaction,
  getEtherBalance,
  timeWarp,
  getCurrentBlockTime
} = require('./general')
const VotableOwner = artifacts.require('VotableOwner.sol')
const ExampleToken = artifacts.require('./mocks/ExampleToken.sol')
const { soliditySha3 } = web3.utils
const { BN } = web3.utils

const defaultName = 'ExampleToken'
const defaultSymbol = 'EXT'
const defaultDecimals = 18
const defaultVoteRequirement = 2
const defaultTokenReleaseDate =
  Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 30
const defaultVotableOwnerTokenBalance = 5e18

const calculateActionId = async (vbo, callData) => {
  const actionNonce = await vbo.actionNonce()

  const actionId = soliditySha3(
    {
      type: 'bytes',
      value: callData
    },
    {
      type: 'uint256',
      value: actionNonce
    }
  )

  return actionId
}

const setupContracts = async () => {
  const tkn = await ExampleToken.new(
    defaultName,
    defaultSymbol,
    defaultDecimals,
    {
      from: tempOwner
    }
  )

  const vbo = await VotableOwner.new(
    voters,
    defaultVoteRequirement,
    defaultTokenReleaseDate,
    tkn.address
  )

  await tkn.mint(vbo.address, defaultVotableOwnerTokenBalance, {
    from: tempOwner
  })

  for (const tokenHolder of tokenHolders) {
    await tkn.mint(tokenHolder, 2e18, {
      from: tempOwner
    })
  }

  await tkn.transferOwnership(vbo.address, {
    from: tempOwner
  })

  return {
    tkn,
    vbo
  }
}

const testTokenInitialization = async (tkn, vbo) => {
  const name = await tkn.name()
  const symbol = await tkn.symbol()
  const decimals = await tkn.decimals()
  const owner = await tkn.owner()
  const paused = await tkn.paused()

  assert.equal(
    name,
    defaultName,
    'name should match given constructor argument'
  )
  assert.equal(
    symbol,
    defaultSymbol,
    'symbol should match given constructor argumen'
  )
  assert.equal(
    decimals.toString(),
    defaultDecimals.toString(),
    'decimals should match given constructor argument'
  )
  assert.equal(
    owner,
    vbo.address,
    'owner should be VotableOwner contract from ownership transfer'
  )
  assert(!paused, 'token should NOT be paused')
}

const testVotableOwnerInitialization = async (vbo, tkn) => {
  const minimumVotes = await vbo.minimumVotes()
  const tokenReleaseDate = await vbo.tokenReleaseDate()
  const voterCount = await vbo.voterCount()
  const token = await vbo.token()
  const tokenBalance = await tkn.balanceOf(vbo.address)
  const etherBalance = await getEtherBalance(vbo.address)

  for (const voter of voters) {
    const isVoter = await vbo.isVoter(voter)

    assert(isVoter, 'voter should be a voter on VotableOwner contract')
  }

  assert.equal(
    minimumVotes.toString(),
    defaultVoteRequirement.toString(),
    'minimumVotes should match given constructor argument'
  )
  assert.equal(
    tokenReleaseDate.toString(),
    defaultTokenReleaseDate.toString(),
    'tokenReleaseDate should match given constructor argument'
  )
  assert.equal(
    voterCount.toString(),
    voters.length.toString(),
    'voters count should match amount of voters given to constructor'
  )
  assert.equal(
    token,
    tkn.address,
    'token should match given constructor argument'
  )
  assert.equal(
    tokenBalance.toString(),
    defaultVotableOwnerTokenBalance.toString(),
    'VotableOwner should have correct token balance'
  )
  assert.equal(
    etherBalance.toString(),
    '0',
    'VotableOwner should NO ether at the start'
  )
}

const testPauseTokenVote = async (vbo, tkn, config) => {
  const { from } = config
  const callData = vbo.contract.methods.pauseToken().encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const prePaused = await tkn.paused()

  await vbo.pauseToken(config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postPaused = await tkn.paused()

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    preActionNonce.toString(),
    postActionNonce.toString(),
    'pre and post actionNonce should match'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert(!prePaused, 'token should NOT start paused')
  assert(!postPaused, 'token should NOT be paused even after voting')
}

const testPauseTokenVoteRun = async (vbo, tkn, config) => {
  const { from } = config
  const callData = vbo.contract.methods.pauseToken().encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const prePaused = await tkn.paused()

  await vbo.pauseToken(config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postPaused = await tkn.paused()

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    postActionNonce.sub(preActionNonce).toString(),
    '1',
    'actionNonce should be incremented by 1 upon successful vote'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert(!prePaused, 'token should NOT start paused')
  assert(postPaused, 'token should be paused after successful vote')
}

const testUnpauseTokenVote = async (vbo, tkn, config) => {
  const { from } = config
  const callData = vbo.contract.methods.unpauseToken().encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const prePaused = await tkn.paused()

  await vbo.unpauseToken(config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postPaused = await tkn.paused()

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    preActionNonce.toString(),
    postActionNonce.toString(),
    'pre and post actionNonce should match'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert(prePaused, 'token should start paused')
  assert(postPaused, 'token should be paused even after vote')
}

const testUnpauseTokenVoteRun = async (vbo, tkn, config) => {
  const { from } = config
  const callData = vbo.contract.methods.unpauseToken().encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const prePaused = await tkn.paused()

  await vbo.unpauseToken(config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postPaused = await tkn.paused()

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    postActionNonce.sub(preActionNonce).toString(),
    '1',
    'actionNonce should be incremented by 1 upon successful vote'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert(prePaused, 'token should start paused')
  assert(!postPaused, 'token should NOT be paused after successful vote')
}

const testRemoveVoterVote = async (vbo, voterToRemove, config) => {
  const { from } = config
  const callData = vbo.contract.methods.removeVoter(voterToRemove).encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preVoterCount = await vbo.voterCount()
  const preIsVoter = await vbo.isVoter(voterToRemove)

  await vbo.removeVoter(voterToRemove, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postVoterCount = await vbo.voterCount()
  const postIsVoter = await vbo.isVoter(voterToRemove)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    preActionNonce.toString(),
    postActionNonce.toString(),
    'pre and post actionNonce should match'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert.equal(
    preVoterCount.toString(),
    postVoterCount.toString(),
    'voterCount should remain the same after voting'
  )

  assert(preIsVoter, 'voterToRemove should be a voter before removing')
  assert(postIsVoter, 'voterToRemove should still be a voter after voting')
}

const testRemoveVoterVoteRun = async (vbo, voterToRemove, config) => {
  const { from } = config
  const callData = vbo.contract.methods.removeVoter(voterToRemove).encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preVoterCount = await vbo.voterCount()
  const preIsVoter = await vbo.isVoter(voterToRemove)

  await vbo.removeVoter(voterToRemove, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postVoterCount = await vbo.voterCount()
  const postIsVoter = await vbo.isVoter(voterToRemove)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    postActionNonce.sub(preActionNonce).toString(),
    '1',
    'actionNonce should be incremented by 1 upon successful vote'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert.equal(
    preVoterCount.sub(postVoterCount).toString(),
    '1',
    'voterCount should be decremented by 1'
  )

  assert(preIsVoter, 'voterToRemove should be a voter before successful vote')
  assert(
    !postIsVoter,
    'voterToRemove should NOT be a voter after successful vote'
  )
}

const testAddVoterVote = async (vbo, voterCandidate, config) => {
  const { from } = config
  const callData = vbo.contract.methods.addVoter(voterCandidate).encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preVoterCount = await vbo.voterCount()
  const preIsVoter = await vbo.isVoter(voterCandidate)

  await vbo.addVoter(voterCandidate, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postVoterCount = await vbo.voterCount()
  const postIsVoter = await vbo.isVoter(voterCandidate)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    preActionNonce.toString(),
    postActionNonce.toString(),
    'pre and post actionNonce should match'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert.equal(
    preVoterCount.toString(),
    postVoterCount.toString(),
    'voterCount should remain the same after voting'
  )

  assert(!preIsVoter, 'voterCandidate should NOT be a voter before voting')
  assert(
    !postIsVoter,
    'voterCandidate should still NOT be a voter after voting'
  )
}

const testAddVoterVoteRun = async (vbo, voterCandidate, config) => {
  const { from } = config
  const callData = vbo.contract.methods.addVoter(voterCandidate).encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preVoterCount = await vbo.voterCount()
  const preIsVoter = await vbo.isVoter(voterCandidate)

  await vbo.addVoter(voterCandidate, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postVoterCount = await vbo.voterCount()
  const postIsVoter = await vbo.isVoter(voterCandidate)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    postActionNonce.sub(preActionNonce).toString(),
    '1',
    'actionNonce should be incremented by 1 upon successful vote'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert.equal(
    postVoterCount.sub(preVoterCount).toString(),
    '1',
    'voterCount should be incremented by 1'
  )

  assert(!preIsVoter, 'voterCandidate should be a voter before successful vote')
  assert(postIsVoter, 'voterCandidate should be a voter after successful vote')
}

const testUpdateMinimumVotesVote = async (vbo, minVotes, config) => {
  const { from } = config
  const callData = vbo.contract.methods.updateMinimumVotes(minVotes).encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preMinVotes = await vbo.minimumVotes()

  await vbo.updateMinimumVotes(minVotes, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postMinVotes = await vbo.minimumVotes()

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    preActionNonce.toString(),
    postActionNonce.toString(),
    'pre and post actionNonce should match'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')
  assert.equal(
    preMinVotes.toString(),
    postMinVotes.toString(),
    'minimumVotes should remain unchanged even after voting'
  )
}

const testUpdateMinimumVotesVoteRun = async (vbo, minVotes, config) => {
  const { from } = config
  const callData = vbo.contract.methods.updateMinimumVotes(minVotes).encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()

  await vbo.updateMinimumVotes(minVotes, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postMinVotes = await vbo.minimumVotes()

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    postActionNonce.sub(preActionNonce).toString(),
    '1',
    'actionNonce should be incremented by 1 upon successful vote'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')
  assert.equal(
    postMinVotes.toString(),
    minVotes.toString(),
    'minimumVotes should be updated to given argument after successful vote'
  )
}

const testReceiveEther = async (vbo, config) => {
  const preContractEtherBalance = await getEtherBalance(vbo.address)

  await sendTransaction(config)

  const postContractEtherBalance = await getEtherBalance(vbo.address)

  assert.equal(
    new BN(postContractEtherBalance)
      .sub(new BN(preContractEtherBalance))
      .toString(),
    new BN(config.value.replace('0x', ''), 16).toString(),
    'VotableOwner ether balance should be incremented by tx value'
  )
}

const testSendEtherVote = async (vbo, etherRecipient, etherAmount, config) => {
  const { from } = config
  const callData = vbo.contract.methods
    .transferEther(etherRecipient, etherAmount)
    .encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preContractEtherBalance = await getEtherBalance(vbo.address)
  const preRecipientEtherBalance = await getEtherBalance(vbo.address)

  await vbo.transferEther(etherRecipient, etherAmount, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postContractEtherBalance = await getEtherBalance(vbo.address)
  const postRecipientEtherBalance = await getEtherBalance(vbo.address)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    preActionNonce.toString(),
    postActionNonce.toString(),
    'pre and post actionNonce should match'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')
  assert.equal(
    preContractEtherBalance.toString(),
    postContractEtherBalance.toString(),
    'VotableOwner ether balance should remain the same after voting'
  )
  assert.equal(
    preRecipientEtherBalance.toString(),
    postRecipientEtherBalance.toString(),
    'etherRecipient ether balance should remain the same after voting'
  )
}

const testSendEtherVoteRun = async (
  vbo,
  etherRecipient,
  etherAmount,
  config
) => {
  const { from } = config
  const callData = vbo.contract.methods
    .transferEther(etherRecipient, etherAmount)
    .encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preContractEtherBalance = await getEtherBalance(vbo.address)
  const preRecipientBalance = await getEtherBalance(etherRecipient)

  await vbo.transferEther(etherRecipient, etherAmount, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postContractEtherBalance = await getEtherBalance(vbo.address)
  const postRecipientBalance = await getEtherBalance(etherRecipient)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    postActionNonce.sub(preActionNonce).toString(),
    '1',
    'actionNonce should be incremented by 1 upon successful vote'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')
  assert.equal(
    new BN(preContractEtherBalance)
      .sub(new BN(postContractEtherBalance))
      .toString(),
    new BN(etherAmount).toString(),
    'VotableOwner ether balance should be decremented by etherAmount'
  )
  assert.equal(
    new BN(postRecipientBalance).sub(new BN(preRecipientBalance)).toString(),
    new BN(etherAmount).toString(),
    'etherRecipient ether balance should be incremented by etherAmount'
  )
}

const testSendTokensVote = async (
  vbo,
  tkn,
  tokenRecipient,
  tokenAmount,
  config
) => {
  const { from } = config
  const callData = vbo.contract.methods
    .transferTokens(tokenRecipient, tokenAmount)
    .encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preContractTokenBalance = await tkn.balanceOf(vbo.address)
  const preRecipientTokenBalance = await tkn.balanceOf(tokenRecipient)

  await vbo.transferTokens(tokenRecipient, tokenAmount, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postContractTokenBalance = await tkn.balanceOf(vbo.address)
  const postRecipientTokenBalance = await tkn.balanceOf(tokenRecipient)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    preActionNonce.toString(),
    postActionNonce.toString(),
    'pre and post actionNonce should match'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert.equal(
    preContractTokenBalance.toString(),
    postContractTokenBalance.toString(),
    'contract token balance should remain unchanged after voting'
  )
  assert.equal(
    preRecipientTokenBalance.toString(),
    postRecipientTokenBalance.toString(),
    'tokenRecipientBalance should remain unchanged after voting'
  )
}

const testSendTokensVoteRun = async (
  vbo,
  tkn,
  tokenRecipient,
  tokenAmount,
  config
) => {
  const { from } = config
  const callData = vbo.contract.methods
    .transferTokens(tokenRecipient, tokenAmount)
    .encodeABI()
  const actionId = await calculateActionId(vbo, callData)
  const preHasVoted = await vbo.hasVoted(actionId, from)
  const preActionVotes = await vbo.actionVotes(actionId)
  const preActionNonce = await vbo.actionNonce()
  const preContractTokenBalance = await tkn.balanceOf(vbo.address)
  const preRecipientTokenBalance = await tkn.balanceOf(tokenRecipient)

  await vbo.transferTokens(tokenRecipient, tokenAmount, config)

  const postHasVoted = await vbo.hasVoted(actionId, from)
  const postActionVotes = await vbo.actionVotes(actionId)
  const postActionNonce = await vbo.actionNonce()
  const postContractTokenBalance = await tkn.balanceOf(vbo.address)
  const postRecipientTokenBalance = await tkn.balanceOf(tokenRecipient)

  assert(!preHasVoted, 'user should have NOT voted on this action before')
  assert.equal(
    postActionVotes.sub(preActionVotes).toString(),
    '1',
    'actionVotes should be incremented by 1'
  )
  assert.equal(
    postActionNonce.sub(preActionNonce).toString(),
    '1',
    'actionNonce should be incremented by 1 upon successful vote'
  )
  assert(postHasVoted, 'voter should be marked as having voted on this action')

  assert.equal(
    preContractTokenBalance.sub(postContractTokenBalance).toString(),
    tokenAmount.toString(),
    'contract token balance should be decremented by tokenAmount after successful vote'
  )
  assert.equal(
    postRecipientTokenBalance.sub(preRecipientTokenBalance).toString(),
    tokenAmount.toString(),
    'tokenRecipient token balance should be incremente by tokenAmount after successful vote'
  )
}

const warpToTokenReleaseDate = async vbo => {
  const currentBlockTime = await getCurrentBlockTime()
  const tokenReleaseDateBig = await vbo.tokenReleaseDate()
  const tokenReleaseDate = tokenReleaseDateBig.toNumber()
  const secondsToWarp = tokenReleaseDate - currentBlockTime + 60

  await timeWarp(secondsToWarp, true)
}

module.exports = {
  defaultName,
  defaultSymbol,
  defaultDecimals,
  defaultVoteRequirement,
  defaultTokenReleaseDate,
  defaultVotableOwnerTokenBalance,
  setupContracts,
  testTokenInitialization,
  testVotableOwnerInitialization,
  testPauseTokenVote,
  testPauseTokenVoteRun,
  testUnpauseTokenVote,
  testUnpauseTokenVoteRun,
  testRemoveVoterVote,
  testRemoveVoterVoteRun,
  testAddVoterVote,
  testAddVoterVoteRun,
  testUpdateMinimumVotesVote,
  testUpdateMinimumVotesVoteRun,
  testReceiveEther,
  testSendEtherVote,
  testSendEtherVoteRun,
  testSendTokensVote,
  testSendTokensVoteRun,
  warpToTokenReleaseDate
}
