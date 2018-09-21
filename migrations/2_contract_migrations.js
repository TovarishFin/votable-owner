const ExampleToken = artifacts.require('./mocks/ExampleToken.sol')
const MultiSigVote = artifacts.require('MultiSigVote.sol')
module.exports = async (deployer, network, accounts) => {
  if (network === 'test') {
    global.accounts = accounts

    return true
  }

  const tempOwner = accounts[0]
  const voters = accounts.slice(1, 4)
  const tokenHolders = accounts.slice(4)

  await deployer.deploy(ExampleToken, 'ExampleToken', 'EXT', 18, {
    from: tempOwner
  })
  const tkn = await ExampleToken.deployed()

  await deployer.deploy(
    MultiSigVote,
    voters,
    2,
    Math.floor(new Date().getTime() / 1000) + 60 * 60,
    tkn.address,
    {
      from: tempOwner
    }
  )
  const msv = await MultiSigVote.deployed()

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
}
