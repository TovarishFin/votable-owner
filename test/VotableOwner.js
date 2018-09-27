const { voters, other, assertRevert, decimals18 } = require('./helpers/general')
const {
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
} = require('./helpers/vbo')
const { BN } = web3.utils

describe('when initializing contracts', () => {
  contract('VotableOwner', () => {
    let tkn, vbo

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      tkn = contracts.tkn
      vbo = contracts.vbo
    })

    it('should start with correct token values', async () => {
      await testTokenInitialization(tkn, vbo)
    })

    it('should start with correct VotableOwner values', async () => {
      await testVotableOwnerInitialization(vbo, tkn)
    })
  })
})

describe('when adding/removing voters', () => {
  contract('VotableOwner', () => {
    const badVoter = voters[2]
    const flimsyVoter = voters[3]
    let vbo

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      vbo = contracts.vbo
    })

    it('should NOT vote to remove when NOT a voter', async () => {
      await assertRevert(
        testRemoveVoterVote(vbo, badVoter, {
          from: other
        })
      )
    })

    it('should vote to remove a voter', async () => {
      await testRemoveVoterVote(vbo, badVoter, {
        from: voters[0]
      })
    })

    it('should NOT vote to remove voter again from same address', async () => {
      await assertRevert(
        testRemoveVoterVote(vbo, badVoter, {
          from: voters[0]
        })
      )
    })

    it('should NOT trigger an action being performed when voting for removing different address', async () => {
      await testRemoveVoterVote(vbo, flimsyVoter, {
        from: voters[0]
      })
    })

    it('should perform remove voter action after enough votes', async () => {
      await testRemoveVoterVoteRun(vbo, badVoter, {
        from: voters[1]
      })
    })

    it('previously pending remove vote should be reset and should NOT trigger an action to be performed', async () => {
      await testRemoveVoterVote(vbo, flimsyVoter, {
        from: voters[0]
      })
    })

    it('should remove another voter after second vote after reset', async () => {
      await testRemoveVoterVoteRun(vbo, flimsyVoter, {
        from: voters[1]
      })
    })

    it('should NOT remove another voter due to minnimumVotes >= voters requirement', async () => {
      await assertRevert(
        testRemoveVoterVote(vbo, voters[1], {
          from: voters[0]
        })
      )
    })

    it('should NOT vote to add voter which is already voter', async () => {
      await assertRevert(
        testAddVoterVote(vbo, voters[1], {
          from: voters[0]
        })
      )
    })

    it('should vote to add voter', async () => {
      await testAddVoterVote(vbo, flimsyVoter, {
        from: voters[0]
      })
    })

    it('should NOT vote to add voter again from same address', async () => {
      await assertRevert(
        testAddVoterVote(vbo, flimsyVoter, {
          from: voters[0]
        })
      )
    })

    it('should perform add voter action after enough votes', async () => {
      await testAddVoterVoteRun(vbo, flimsyVoter, {
        from: voters[1]
      })
    })
  })
})

describe('when changing minimumVotes', () => {
  contract('VotableOwner', () => {
    const minVotes = 3
    const tooLargeMinVotes = 5
    const tooSmallMinVotes = 1
    let vbo

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      vbo = contracts.vbo
    })

    it('should NOT vote to update minimum votes if NOT voter', async () => {
      await assertRevert(
        testUpdateMinimumVotesVote(vbo, minVotes, {
          from: other
        })
      )
    })

    it('should NOT vote to update minimum votes if more than voters', async () => {
      await assertRevert(
        testUpdateMinimumVotesVote(vbo, tooLargeMinVotes, {
          from: voters[0]
        })
      )
    })

    it('should NOT vote to update minimum votes if less than 2', async () => {
      await assertRevert(
        testUpdateMinimumVotesVote(vbo, tooSmallMinVotes, {
          from: voters[0]
        })
      )
    })

    it('should NOT vote to update minimum votes if same as current', async () => {
      const sameMinVotes = await vbo.minimumVotes()
      await assertRevert(
        testUpdateMinimumVotesVote(vbo, sameMinVotes, {
          from: voters[0]
        })
      )
    })

    it('should vote to update minimum votes', async () => {
      await testUpdateMinimumVotesVote(vbo, minVotes, {
        from: voters[0]
      })
    })

    it('should perform update minimum votes action after enough votes', async () => {
      await testUpdateMinimumVotesVoteRun(vbo, minVotes, {
        from: voters[1]
      })
    })
  })
})

describe('when pausing/unpausing', () => {
  contract('VotableOwner', () => {
    let tkn, vbo

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      tkn = contracts.tkn
      vbo = contracts.vbo
    })

    it('should NOT allow voting for pause token action by a non-voter', async () => {
      await assertRevert(
        testPauseTokenVote(vbo, tkn, {
          from: other
        })
      )
    })

    it('should vote to pause token', async () => {
      await testPauseTokenVote(vbo, tkn, {
        from: voters[0]
      })
    })

    it('should NOT vote to pause again from same address', async () => {
      await assertRevert(
        testPauseTokenVote(vbo, tkn, {
          from: voters[0]
        })
      )
    })

    it('should perform pause token action after enough votes', async () => {
      await testPauseTokenVoteRun(vbo, tkn, {
        from: voters[1]
      })
    })

    it('should NOT allow voting for unpause action by a non-voter', async () => {
      await assertRevert(
        testUnpauseTokenVote(vbo, tkn, {
          from: other
        })
      )
    })

    it('should vote to unpause token', async () => {
      await testUnpauseTokenVote(vbo, tkn, {
        from: voters[1]
      })
    })

    it('should NOT vote to unpause again from same address', async () => {
      await assertRevert(
        testUnpauseTokenVote(vbo, tkn, {
          from: voters[1]
        })
      )
    })

    it('should perform unpause token action after enough votes', async () => {
      await testUnpauseTokenVoteRun(vbo, tkn, {
        from: voters[2]
      })
    })
  })
})

describe('when handling ether', () => {
  contract('VotableOwner', () => {
    const etherRecipient = voters[0]
    const etherAmount = new BN(1).mul(decimals18)
    let vbo

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      vbo = contracts.vbo
    })

    it('should receive ether without problems', async () => {
      await testReceiveEther(vbo, {
        to: vbo.address,
        from: other,
        value: etherAmount
      })
    })

    it('should NOT allow vote for sending ether by a non-voter', async () => {
      await assertRevert(
        testSendEtherVote(vbo, etherRecipient, etherAmount, {
          from: other
        })
      )
    })

    it('should vote to send ether', async () => {
      await testSendEtherVote(vbo, etherRecipient, etherAmount, {
        from: voters[0]
      })
    })

    it('should NOT vote to send ether again from same address', async () => {
      await assertRevert(
        testSendEtherVote(vbo, etherRecipient, etherAmount, {
          from: voters[0]
        })
      )
    })

    it('should perform send ether action after enough votes', async () => {
      await testSendEtherVoteRun(vbo, etherRecipient, etherAmount, {
        from: voters[1]
      })
    })
  })
})

describe('when handling tokens on VotableOwner', () => {
  contract('VotableOwner', () => {
    const etherRecipient = voters[0]
    const etherAmount = new BN(1).mul(decimals18)
    let vbo, tkn

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      vbo = contracts.vbo
      tkn = contracts.tkn
    })

    it('should NOT allow vote for sending tokens if before token release date', async () => {
      await assertRevert(
        testSendTokensVote(vbo, tkn, etherRecipient, etherAmount, {
          from: other
        })
      )
    })

    it('should time travel to after token release date', async () => {
      await warpToTokenReleaseDate(vbo)
    })

    it('should NOT allow vote for sending tokens by a non-voter', async () => {
      await assertRevert(
        testSendTokensVote(vbo, tkn, etherRecipient, etherAmount, {
          from: other
        })
      )
    })

    it('should vote to send tokens', async () => {
      await testSendTokensVote(vbo, tkn, etherRecipient, etherAmount, {
        from: voters[0]
      })
    })

    it('should NOT vote to send tokens again from same address', async () => {
      await assertRevert(
        testSendTokensVote(vbo, tkn, etherRecipient, etherAmount, {
          from: voters[0]
        })
      )
    })

    it('should perform send tokens action after enough votes', async () => {
      await testSendTokensVoteRun(vbo, tkn, etherRecipient, etherAmount, {
        from: voters[1]
      })
    })
  })
})

describe('when changing minimumVotes during another vote', () => {
  contract('VotableOwner', () => {
    let vbo, tkn

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      vbo = contracts.vbo
      tkn = contracts.tkn
    })

    it('should vote to pause token', async () => {
      await testPauseTokenVote(vbo, tkn, {
        from: voters[0]
      })
    })

    it('should update minimum votes', async () => {
      await testUpdateMinimumVotesVote(vbo, 3, {
        from: voters[0]
      })

      await testUpdateMinimumVotesVoteRun(vbo, 3, {
        from: voters[1]
      })
    })

    it('should require 3 NEW votes to pause token after minimumVotes updated', async () => {
      await testPauseTokenVote(vbo, tkn, {
        from: voters[0]
      })

      await testPauseTokenVote(vbo, tkn, {
        from: voters[1]
      })

      await testPauseTokenVoteRun(vbo, tkn, {
        from: voters[2]
      })
    })
  })
})

describe('when adding voter during another vote', () => {
  contract('VotableOwner', () => {
    const badVoter = voters[3]
    let vbo, tkn

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      vbo = contracts.vbo
      tkn = contracts.tkn
    })

    it('should vote to pause token', async () => {
      await testPauseTokenVote(vbo, tkn, {
        from: voters[0]
      })
    })

    it('should add voter', async () => {
      await testRemoveVoterVote(vbo, badVoter, {
        from: voters[0]
      })

      await testRemoveVoterVoteRun(vbo, badVoter, {
        from: voters[1]
      })
    })

    it('should require 2 NEW votes to pause token after voter removed', async () => {
      await testPauseTokenVote(vbo, tkn, {
        from: voters[0]
      })

      await testPauseTokenVoteRun(vbo, tkn, {
        from: voters[1]
      })
    })
  })
})

describe('when voting resulting in a successful action and voting again', () => {
  contract('VotableOwner', () => {
    let vbo, tkn

    before('setup contracts', async () => {
      const contracts = await setupContracts()
      vbo = contracts.vbo
      tkn = contracts.tkn
    })

    it('should vote and pause token after two votes', async () => {
      await testPauseTokenVote(vbo, tkn, {
        from: voters[0]
      })

      await testPauseTokenVoteRun(vbo, tkn, {
        from: voters[1]
      })
    })

    it('should vote and unpause token for second round of pause votes', async () => {
      await testUnpauseTokenVote(vbo, tkn, {
        from: voters[0]
      })

      await testUnpauseTokenVoteRun(vbo, tkn, {
        from: voters[1]
      })
    })

    it('should vote and pause token after two votes again', async () => {
      await testPauseTokenVote(vbo, tkn, {
        from: voters[0]
      })

      await testPauseTokenVoteRun(vbo, tkn, {
        from: voters[1]
      })
    })
  })
})
