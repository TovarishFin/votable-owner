const { voters, other, assertRevert } = require('./helpers/general')
const {
  setupContracts,
  testTokenInitialization,
  testMultiSigInitialization,
  testPauseTokenVote,
  testPauseTokenVoteRun,
  testUnpauseTokenVote,
  testUnpauseTokenVoteRun,
  testRemoveVoter,
  testRemoveVoterRun
} = require('./helpers/msv')

describe('when initializing MultiSigVote', () => {
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
  })
})

describe('when pausing/unpausing using MultiSigVote', () => {
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

    it('should NOT allow voting for pause token action by a non-voter', async () => {
      await assertRevert(
        testPauseTokenVote(msv, tkn, {
          from: other
        })
      )
    })

    it('should vote to pause token', async () => {
      await testPauseTokenVote(msv, tkn, {
        from: voters[0]
      })
    })

    it('should NOT vote to pause again from same address', async () => {
      await assertRevert(
        testPauseTokenVote(msv, tkn, {
          from: voters[0]
        })
      )
    })

    it('should perform pause token action after enough votes', async () => {
      await testPauseTokenVoteRun(msv, tkn, {
        from: voters[1]
      })
    })

    it('should NOT allow voting for unpause action by a non-voter', async () => {
      await assertRevert(
        testUnpauseTokenVote(msv, tkn, {
          from: other
        })
      )
    })

    it('should vote to unpause token', async () => {
      await testUnpauseTokenVote(msv, tkn, {
        from: voters[1]
      })
    })

    it('should NOT vote to unpause again from same address', async () => {
      await assertRevert(
        testUnpauseTokenVote(msv, tkn, {
          from: voters[1]
        })
      )
    })

    it('should perform unpause token action after enough votes', async () => {
      await testUnpauseTokenVoteRun(msv, tkn, {
        from: voters[2]
      })
    })
  })
})

describe('when updating voting parameters of MultiSigVote', () => {
  contract('MultiSigVote', () => {
    const badVoter = voters[2]
    const anotherBadVoter = voters[3]
    let msv
    before('setup contracts', async () => {
      const contracts = await setupContracts()
      msv = contracts.msv
    })

    it('should NOT vote to remove when NOT a voter', async () => {
      await assertRevert(
        testRemoveVoter(msv, badVoter, {
          from: other
        })
      )
    })

    it('should vote to remove a voter', async () => {
      await testRemoveVoter(msv, badVoter, {
        from: voters[0]
      })
    })

    it('should NOT vote to remove voter again from same address', async () => {
      await assertRevert(
        testRemoveVoter(msv, badVoter, {
          from: voters[0]
        })
      )
    })

    it('should not trigger an action being performed when voting for removing different address', async () => {
      await testRemoveVoter(msv, anotherBadVoter, {
        from: voters[0]
      })
    })

    it('should perform remove voter action after enough votes', async () => {
      await testRemoveVoterRun(msv, badVoter, {
        from: voters[1]
      })
    })

    it('previously pending remove vote should be reset and should NOT trigger an action to be performed', async () => {
      await testRemoveVoter(msv, anotherBadVoter, {
        from: voters[0]
      })
    })

    it('should remove another voter after second vote after reset', async () => {
      await testRemoveVoterRun(msv, anotherBadVoter, {
        from: voters[1]
      })
    })

    it('should NOT remove another voter due to minnimumVotes >= voters requirement', async () => {
      await assertRevert(
        testRemoveVoter(msv, voters[1], {
          from: voters[0]
        })
      )
    })
  })
})
