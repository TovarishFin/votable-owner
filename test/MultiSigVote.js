const { voters, other, assertRevert, decimals18 } = require('./helpers/general')
const {
  setupContracts,
  testTokenInitialization,
  testMultiSigInitialization,
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
} = require('./helpers/msv')
const { BN } = web3.utils

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

describe('when adding/removing voters on MultiSigVote', () => {
  contract('MultiSigVote', () => {
    const badVoter = voters[2]
    const flimsyVoter = voters[3]
    let msv

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      msv = contracts.msv
    })

    it('should NOT vote to remove when NOT a voter', async () => {
      await assertRevert(
        testRemoveVoterVote(msv, badVoter, {
          from: other
        })
      )
    })

    it('should vote to remove a voter', async () => {
      await testRemoveVoterVote(msv, badVoter, {
        from: voters[0]
      })
    })

    it('should NOT vote to remove voter again from same address', async () => {
      await assertRevert(
        testRemoveVoterVote(msv, badVoter, {
          from: voters[0]
        })
      )
    })

    it('should NOT trigger an action being performed when voting for removing different address', async () => {
      await testRemoveVoterVote(msv, flimsyVoter, {
        from: voters[0]
      })
    })

    it('should perform remove voter action after enough votes', async () => {
      await testRemoveVoterVoteRun(msv, badVoter, {
        from: voters[1]
      })
    })

    it('previously pending remove vote should be reset and should NOT trigger an action to be performed', async () => {
      await testRemoveVoterVote(msv, flimsyVoter, {
        from: voters[0]
      })
    })

    it('should remove another voter after second vote after reset', async () => {
      await testRemoveVoterVoteRun(msv, flimsyVoter, {
        from: voters[1]
      })
    })

    it('should NOT remove another voter due to minnimumVotes >= voters requirement', async () => {
      await assertRevert(
        testRemoveVoterVote(msv, voters[1], {
          from: voters[0]
        })
      )
    })

    it('should NOT vote to add voter which is already voter', async () => {
      await assertRevert(
        testAddVoterVote(msv, voters[1], {
          from: voters[0]
        })
      )
    })

    it('should vote to add voter', async () => {
      await testAddVoterVote(msv, flimsyVoter, {
        from: voters[0]
      })
    })

    it('should NOT vote to add voter again from same address', async () => {
      await assertRevert(
        testAddVoterVote(msv, flimsyVoter, {
          from: voters[0]
        })
      )
    })

    it('should perform add voter action after enough votes', async () => {
      await testAddVoterVoteRun(msv, flimsyVoter, {
        from: voters[1]
      })
    })
  })
})

describe('when changing minimumVotes on MultiSigVote', () => {
  contract('MultiSigVote', () => {
    const minVotes = 3
    const tooLargeMinVotes = 5
    const tooSmallMinVotes = 1
    let msv

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      msv = contracts.msv
    })

    it('should NOT vote to update minimum votes if NOT voter', async () => {
      await assertRevert(
        testUpdateMinimumVotesVote(msv, minVotes, {
          from: other
        })
      )
    })

    it('should NOT vote to update minimum votes if more than voters', async () => {
      await assertRevert(
        testUpdateMinimumVotesVote(msv, tooLargeMinVotes, {
          from: voters[0]
        })
      )
    })

    it('should NOT vote to update minimum votes if less than 2', async () => {
      await assertRevert(
        testUpdateMinimumVotesVote(msv, tooSmallMinVotes, {
          from: voters[0]
        })
      )
    })

    it('should NOT vote to update minimum votes if same as current', async () => {
      const sameMinVotes = await msv.minimumVotes()
      await assertRevert(
        testUpdateMinimumVotesVote(msv, sameMinVotes, {
          from: voters[0]
        })
      )
    })

    it('should vote to update minimum votes', async () => {
      await testUpdateMinimumVotesVote(msv, minVotes, {
        from: voters[0]
      })
    })

    it('should perform update minimum votes action after enough votes', async () => {
      await testUpdateMinimumVotesVoteRun(msv, minVotes, {
        from: voters[1]
      })
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

describe('when handling ether on MultiSigVote', () => {
  contract('MultiSigVote', () => {
    const etherRecipient = voters[0]
    const etherAmount = new BN(1).mul(decimals18)
    let msv

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      msv = contracts.msv
    })

    it('should receive ether without problems', async () => {
      await testReceiveEther(msv, {
        to: msv.address,
        from: other,
        value: etherAmount
      })
    })

    it('should NOT allow vote for sending ether by a non-voter', async () => {
      await assertRevert(
        testSendEtherVote(msv, etherRecipient, etherAmount, {
          from: other
        })
      )
    })

    it('should vote to send ether', async () => {
      await testSendEtherVote(msv, etherRecipient, etherAmount, {
        from: voters[0]
      })
    })

    it('should NOT vote to send ether again from same address', async () => {
      await assertRevert(
        testSendEtherVote(msv, etherRecipient, etherAmount, {
          from: voters[0]
        })
      )
    })

    it('should perform send ether action after enough votes', async () => {
      await testSendEtherVoteRun(msv, etherRecipient, etherAmount, {
        from: voters[1]
      })
    })
  })
})

describe('when handling tokens on MultiSigVote', () => {
  contract('MultiSigVote', () => {
    const etherRecipient = voters[0]
    const etherAmount = new BN(1).mul(decimals18)
    let msv, tkn

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      msv = contracts.msv
      tkn = contracts.tkn
    })

    it('should NOT allow vote for sending tokens if before token release date', async () => {
      await assertRevert(
        testSendTokensVote(msv, tkn, etherRecipient, etherAmount, {
          from: other
        })
      )
    })

    it('should time travel to after token release date', async () => {
      await warpToTokenReleaseDate(msv)
    })

    it('should NOT allow vote for sending tokens by a non-voter', async () => {
      await assertRevert(
        testSendTokensVote(msv, tkn, etherRecipient, etherAmount, {
          from: other
        })
      )
    })

    it('should vote to send tokens', async () => {
      await testSendTokensVote(msv, tkn, etherRecipient, etherAmount, {
        from: voters[0]
      })
    })

    it('should NOT vote to send tokens again from same address', async () => {
      await assertRevert(
        testSendTokensVote(msv, tkn, etherRecipient, etherAmount, {
          from: voters[0]
        })
      )
    })

    it('should perform send tokens action after enough votes', async () => {
      await testSendTokensVoteRun(msv, tkn, etherRecipient, etherAmount, {
        from: voters[1]
      })
    })
  })
})
