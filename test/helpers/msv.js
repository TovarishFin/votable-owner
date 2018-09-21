const {
  tempOwner,
  voters,
  tokenHolders,
  sendTransaction,
  getEtherBalance
} = require('./general')
const MultiSigVote = artifacts.require('MultiSigVote.sol')
const ExampleToken = artifacts.require('./mocks/ExampleToken.sol')
const { soliditySha3 } = web3.utils

const defaultName = 'ExampleToken'
const defaultSymbol = 'EXT'
const defaultDecimals = 18
const defaultVoteRequirement = 2
const defaultTokenReleaseDate =
  Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 30
const defaultMultiSigTokenBalance = 5e18
const defaultMultiSigEtherBalance = 1e18

const actionEnum = {
  transferEther: 0,
  pauseToken: 1,
  unpauseToken: 2,
  transferTokens: 3,
  addVoter: 4,
  removeVoter: 5,
  updateMinimumVotes: 6
}

const calculateActionId = async (msv, actionUint, ...functionArgs) => {
  const actionNonce = await msv.actionNonces(actionUint)
  const minimumVotes = await msv.minimumVotes()
  const voterCount = await msv.voterCount()
  const paramHash =
    functionArgs.length > 0 ? soliditySha3(...functionArgs) : '0x0'

  const actionId = soliditySha3(
    {
      type: 'uint256',
      value: actionUint
    },
    {
      type: 'bytes32',
      value: paramHash
    },
    {
      type: 'uint256',
      value: actionNonce
    },
    {
      type: 'uint256',
      value: minimumVotes
    },
    {
      type: 'uint256',
      value: voterCount
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

  const msv = await MultiSigVote.new(
    voters,
    defaultVoteRequirement,
    defaultTokenReleaseDate,
    tkn.address
  )

  await tkn.mint(msv.address, defaultMultiSigTokenBalance, {
    from: tempOwner
  })

  for (const tokenHolder of tokenHolders) {
    await tkn.mint(tokenHolder, 2e18, {
      from: tempOwner
    })
  }

  await tkn.transferOwnership(msv.address, {
    from: tempOwner
  })

  await sendTransaction({
    to: msv.address,
    from: tempOwner,
    value: defaultMultiSigEtherBalance
  })

  return {
    tkn,
    msv
  }
}

const testTokenInitialization = async (tkn, msv) => {
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
    msv.address,
    'owner should be MultiSig contract from ownership transfer'
  )
  assert(!paused, 'token should NOT be paused')
}

const testMultiSigInitialization = async (msv, tkn) => {
  const minimumVotes = await msv.minimumVotes()
  const tokenReleaseDate = await msv.tokenReleaseDate()
  const voterCount = await msv.voterCount()
  const token = await msv.token()
  const tokenBalance = await tkn.balanceOf(msv.address)
  const etherBalance = await getEtherBalance(msv.address)

  for (const voter of voters) {
    const isVoter = await msv.isVoter(voter)

    assert(isVoter, 'voter should be a voter on MultiSig contract')
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
    defaultMultiSigTokenBalance.toString(),
    'MultiSig should have correct token balance'
  )
  assert.equal(
    etherBalance.toString(),
    defaultMultiSigEtherBalance.toString(),
    'MultiSig should have correct ether balance'
  )
}

const testPauseTokenVote = async (msv, tkn, config) => {
  const { from } = config
  const actionId = await calculateActionId(msv, actionEnum.pauseToken)
  const preHasVoted = await msv.hasVoted(actionId, from)
  const preActionVotes = await msv.actionVotes(actionId)
  const preActionNonce = await msv.actionNonces(actionEnum.pauseToken)
  const prePaused = await tkn.paused()

  await msv.pauseToken(config)

  const postHasVoted = await msv.hasVoted(actionId, from)
  const postActionVotes = await msv.actionVotes(actionId)
  const postActionNonce = await msv.actionNonces(actionEnum.pauseToken)
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
  assert(!prePaused, 'token should NOT start paused')
  assert(!postPaused, 'token should NOT be paused even after voting')
  assert(postHasVoted, 'voter should be marked as having voted on this action')
}

const testPauseTokenVoteRun = async (msv, tkn, config) => {
  const { from } = config
  const actionId = await calculateActionId(msv, actionEnum.pauseToken)
  const preHasVoted = await msv.hasVoted(actionId, from)
  const preActionVotes = await msv.actionVotes(actionId)
  const preActionNonce = await msv.actionNonces(actionEnum.pauseToken)
  const prePaused = await tkn.paused()

  await msv.pauseToken(config)

  const postHasVoted = await msv.hasVoted(actionId, from)
  const postActionVotes = await msv.actionVotes(actionId)
  const postActionNonce = await msv.actionNonces(actionEnum.pauseToken)
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
  assert(!prePaused, 'token should NOT start paused')
  assert(postPaused, 'token should be paused even after successful vote')
  assert(postHasVoted, 'voter should be marked as having voted on this action')
}

module.exports = {
  setupContracts,
  testTokenInitialization,
  testMultiSigInitialization,
  testPauseTokenVote,
  testPauseTokenVoteRun
}
