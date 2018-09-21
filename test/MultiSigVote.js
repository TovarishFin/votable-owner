const {
  setupContracts,
  testTokenInitialization,
  testMultiSigInitialization
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
      await testTokenInitialization(tkn)
    })

    it('should start with correct multi sig values', async () => {
      await testMultiSigInitialization(msv, tkn)
    })
  })
})
