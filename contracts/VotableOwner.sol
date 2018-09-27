pragma solidity ^0.4.24;

import "./interfaces/IPausableToken.sol";

/**
  @title VotableOwner can act as the owner for other contracts and requires a minimum vote for any owner action before running.
  It can also act as a "multi-sig" wallet for tokens and ether. 
  @notice Any non-private/internal function other than constructor implements a voting pattern where running a given function
  will act as a vote for the function until the minimumVotes requirement has been met. The voter calling a function triggering minimumVotes
  to be met will trigger the action to be performed. Once when an action has been performed after a successful vote, all votes for all
  actions are reset.

  @dev The voting aspect of this contract operates on the principle of hashes and nonces. Actions in this contract can be
  defined as an action that a voter wants to take. These actions are expressed/performed through functions. 
  actionNonces holds a nonce which is incremented every time that any vote has been passed. 
  Each time an action is voted on by a voter, voteHasPassed() is run which creates the appropriate  _actionId. 
  The _actionId is calculated by hashing the following: 
    - msg.data (contains function signature and call data)
      - function signature ensures that a vote is only for a particular action (ex. pauseToken) and not another (ex. unpauseToken)
      - call data ensures that a particular function with different arguments doesnt count as a vote for that same action with different arguments
    - actionNonce
      - hashing the nonce ensures that voting is reset each time a vote has passed
  
  The _actionId is used for tracking:
    - votes for a particular action
    - whether a voter has already voted for an action
  
  Once when the function relating to a given action has been called by enough different voters, the vote has passed and
  the final person voting triggers the action to be performed. As stated above, the action nonce is incremented which
  effectively resets all of the voting logic.
 */
contract VotableOwner {
  
  // minimum votes needed for any action to successfully run
  uint256 public minimumVotes;
  // unix timestamp indicating when voters tokens can be released
  uint256 public tokenReleaseDate;
  // keeps track of how many voters currently exist
  uint256 public voterCount;
  // token on which this wallet operates as owner
  IPausableToken public token;
  // mapping used for voter permissions
  mapping(address => bool) public isVoter;
  // keeps track of each vote for a given action
  mapping(bytes32 => uint256) public actionVotes;
  // keeps track of whether a voter has already voted for a given action
  mapping(bytes32 => mapping(address => bool)) public hasVoted;
  // increments every time a vote has been passed reseting all pending votes
  uint256 public actionNonce;

  event VotersTokensTransferred(
    address recipient,
    uint256 value
  );
  event VotersEtherTransferred(
    address recipient,
    uint256 value
  );
  event VoterAdded(
    address voter
  );
  event VoterRemoved(
    address voter
  );
  event MinimumVotesUpdated(
    uint256 oldMinimumVotes,
    uint256 newMinimumVotes
  );

  modifier onlyVoter() {
    require(isVoter[msg.sender]);

    _;
  }

  /**
    @dev initializes the contract with: appropriate voters, minimum votes needed for
    an action, appropriate date for token release, and address of token on which to operate
    @param _voters an array of addresses who should start as voters
    @param _minimumVotes minimum votes needed for any action (each voter can only vote once)
    @param _tokenReleaseDate unix timestamp at which tokens can be released
    @param _token the token on which to operate (transfer voters tokens, pause/unpause)
   */
  constructor(
    address[] _voters,
    uint256 _minimumVotes,
    uint256 _tokenReleaseDate,
    IPausableToken _token
  )
    public
  {
    uint256 _codeSize;
    assembly { _codeSize := extcodesize(_token) }
    require(_codeSize > 0);
    require(_voters.length > 1);
    require(_minimumVotes > 1);
    require(_minimumVotes <= _voters.length);
    require(_tokenReleaseDate > block.timestamp);

    for(uint256 _i = 0; _i < _voters.length; _i++) {
      isVoter[_voters[_i]] = true;

      emit VoterAdded(_voters[_i]);
    }

    voterCount = _voters.length;
    minimumVotes = _minimumVotes;
    tokenReleaseDate = _tokenReleaseDate;
    token = _token;
  }

  /**
    @dev wrap any votable action in an if statement using this function to implement to implement voting logic
    this function increments the vote count and checks if minimum votes requirement
    has been met. if minimum vote count has been met, actionNonce will
    be incremented, effectively resetting the vote count and whether a voter has voted.
    the function will return true if vote count requirement has been met and false if not.
    Changing minimumVotes or voterCount also effectively resets votes.
   */
  function voteHasPassed() 
    internal
    returns (bool)
  {
    bytes32 _actionId = keccak256(abi.encodePacked(
      msg.data,
      actionNonce
    ));

    require(!hasVoted[_actionId][msg.sender]);

    actionVotes[_actionId]++;
    hasVoted[_actionId][msg.sender] = true;

    if (actionVotes[_actionId] >= minimumVotes) {
      actionNonce++;

      return true;
    }

    return false;
  }

  /**
    @notice vote for transferring a given amount of ether from the wallet to a given address
    @param _recipient address to receive the ether
    @param _value amount of ether in wei to send to _recipient
   */
  function transferEther(
    address _recipient,
    uint256 _value
  )
    external
    onlyVoter
    returns (bool)
  {
    require(_recipient != address(0));

    if (voteHasPassed()) {
      _recipient.transfer(_value);

      emit VotersEtherTransferred(
        _recipient,
        _value
      );
    }

    return true;
  }

  /**
    @notice pauses the token contract, halting transfers
   */
  function pauseToken()
    external
    onlyVoter
    returns (bool)
  {
    if (voteHasPassed()) {
      token.pause();
    }

    return true;
  }

  /**
    @notice unpauses the token contrct, enabling transfers
   */
  function unpauseToken()
    external
    onlyVoter
    returns (bool)
  {
    if (voteHasPassed()) {
      token.unpause();
    }
    
    return true;
  }

  /**
    @notice transfers given amount of voters tokens to given address (must be after tokenReleaseDate)
    @param _recipient address to receive tokens
    @param _value amount of tokens to send to _recipient
   */
  function transferTokens(
    address _recipient,
    uint256 _value
  )
    external
    onlyVoter
    returns (bool)
  {
    require( block.timestamp > tokenReleaseDate);

    if (voteHasPassed()) {
      token.transfer(_recipient, _value);

      emit VotersTokensTransferred(
        _recipient,
        _value
      );
    }

    return true;
  }

  /**
    @notice adds a new voter to wallet, allowing new voter to vote
    @param _newVoter address to add as a new voter
   */
  function addVoter(
    address _newVoter
  )
    external
    onlyVoter
    returns (bool)
  {
    require(!isVoter[_newVoter]);

    if (voteHasPassed()) {
      isVoter[_newVoter] = true;
      voterCount++;

      emit VoterAdded(_newVoter);
    }

    return true;
  }

  /**
    @notice removes a voter from wallet, removing voting rights
    @param _voter address of voter to remove
   */
  function removeVoter(
    address _voter
  )
    external
    onlyVoter
    returns (bool)
  {
    require(isVoter[_voter]);
    require(voterCount - 1 >= minimumVotes);

    if (voteHasPassed()) {
      isVoter[_voter] = false;
      voterCount--;

      emit VoterRemoved(_voter);
    }

    return true;
  }

  /**
    @notice vote for updating minimum votes needed to perform an action
    @param _minimumVotes proposed amount of votes needed to perform an action
   */
  function updateMinimumVotes(
    uint256 _minimumVotes
  )
    external
    onlyVoter
    returns (bool)
  {
    require(_minimumVotes > 1);
    require(_minimumVotes <= voterCount);
    require(_minimumVotes != minimumVotes);

    if (voteHasPassed()) {
      uint256 _oldMinimumVotes = minimumVotes;
      minimumVotes = _minimumVotes;

      emit MinimumVotesUpdated(
        _oldMinimumVotes,
        _minimumVotes
      );
    }

    return true;
  }

  /**
    @dev this function allows for ether to be sent to this contract
   */
  function()
    public
    payable
  {}
}