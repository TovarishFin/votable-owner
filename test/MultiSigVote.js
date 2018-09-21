const { voters } = require('./helpers/general')
const {
  setupContracts,
  testTokenInitialization,
  testMultiSigInitialization,
  testPauseTokenVote,
  testPauseTokenVoteRun
} = require('./helpers/msv')

describe('when using MultiSigVote', () => {
  contract('MultiSigVote', () => {
    let tkn, msv
    before('setup contracts', async () => {
      const contracts = await setupContracts()
      tkn = contracts.tkn
      msv = contracts.msv
    })

    it('should start with correct token values', async () => {
      await testTokenInitialization(tkn, msv)
    })

    it('should start with correct multi sig values', async () => {
      await testMultiSigInitialization(msv, tkn)
    })

    it('should vote to pause token', async () => {
      await testPauseTokenVote(msv, tkn, {
        from: voters[0]
      })
    })

    it('should perform pause token action after enough votes', async () => {
      await testPauseTokenVoteRun(msv, tkn, {
        from: voters[2]
      })
    })
  })
})
