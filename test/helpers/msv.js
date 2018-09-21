const { tempOwner, voters, tokenHolders } = require('./general')
const MultiSigVote = artifacts.require('MultiSigVote.sol')
const ExampleToken = artifacts.require('./mocks/ExampleToken.sol')

const defaultName = 'ExampleToken'
const defaultSymbol = 'EXT'
const defaultDecimals = 18
const defaultVoteRequirement = 2
const defaultTokenReleaseDate =
  Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 30

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

  await tkn.mint(msv.address, 5e18, {
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

  return {
    tkn,
    msv
  }
}

const testTokenInitialization = async tkn => {
  const name = await tkn.name()
  const symbol = await tkn.symbol()
  const decimals = await tkn.decimals()

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
}

const testMultiSigInitialization = async (msv, tkn) => {
  const minimumVotes = await msv.minimumVotes()
  const tokenReleaseDate = await msv.tokenReleaseDate()
  const votersCount = await msv.votersCount()
  const token = await msv.token()

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
    votersCount.toString(),
    voters.length.toString(),
    'voters count should match amount of voters given to constructor'
  )
  assert.equal(
    token,
    tkn.address,
    'token should match given constructor argument'
  )
}

module.exports = {
  setupContracts,
  testTokenInitialization,
  testMultiSigInitialization
}
