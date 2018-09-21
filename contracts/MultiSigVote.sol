pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./interfaces/IPausableToken.sol";

/**
  @title VotersWallet acts as the owner for all contracts and requires a minimum vote for any owner action before running. 
  @notice This contract operates on voting principles calling any of the following functions will result in a vote for
  performing the given action:
    - transferEther
    - pauseToken
    - unpauseToken
    - transferTokens
    - addVoter
    - removeVoter
  The last person voting for a given action by calling any of the above the functions will trigger the action being performed.

  @dev The voting aspect of this contract operates on the principle of hashes and nonces. Actions in this contract can be
  defined as an action that a voter wants to take. These actions are expressed/performed through functions. Each action 
  is represented in the Actions enum. actionNonces holds a nonce which is incremented every time that a vote has been passed. 
  Each time an action is voted on by a voter, voteHasPassed() is run which creates the appropriate  _actionId. 
  The _actionId is calculated by hashing the following: 
    - Action enum as a uint256 
    - _paramHash which is calculated by hashing any arguments for a function relating to an action
    - action nonce (contained in actionNonces for each Action enum)
    - minimumVotes which effectively resets all action votes if minimumVotes has been changed
    - voterCount which effectively resets all action votesif voterCount has been changed (voter has been added or removed)
  
  Once when the function relating to a given action has been called by enough different voters, the vote has passed and
  the final person voting triggers the action to be performed. As stated above, the action nonce is incremented which
  effectively resets all of the voting logic for a given action.
 */
contract MultiSigVote {
  using SafeMath for uint256;
  
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
  // keeps track of nonces for creating action ids once when a vote has passed for an action
  mapping(uint256 => uint256) public actionNonces;

  // enum listing all possible actions which can be taken by this contract
  enum Actions {
    TransferEther,
    PauseToken,
    UnpauseToken,
    TransferTokens,
    AddVoter,
    RemoveVoter,
    UpdateMinimumVotes
  }

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

  modifier onlyVoters() {
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
    @dev this function increments the vote count and checks if minimum votes requirement
    has been met. if minimum vote count has been met, the nonce for a given action will
    be incremented effectively resetting the vote count and whether a voter has voted.
    the function will return true if vote count requirement has been met and false if not.
    Changing minimumVotes or voterCount also effectively resets votes.

    @param _action an Actions enum indicating the action type to be voted on/performed
    @param _paramHash bytes32 keccak256 hash of all function arguments which ensures that
    all voters vote on the same action with the same arguments.
   */
  function voteHasPassed(
    Actions _action,
    bytes32 _paramHash
  ) 
    internal
    returns (bool)
  {
    uint256 _actionUint = uint256(_action);
    uint256 _actionNonce = actionNonces[_actionUint];
    bytes32 _actionId = keccak256(abi.encodePacked(
      _actionUint, 
      _paramHash, 
      _actionNonce, 
      minimumVotes, 
      voterCount
      )
    );
    require(!hasVoted[_actionId][msg.sender]);

    actionVotes[_actionId] = actionVotes[_actionId].add(1);
    hasVoted[_actionId][msg.sender] = true;

    if (actionVotes[_actionId] >= minimumVotes) {
      actionNonces[_actionUint] = actionNonces[_actionUint].add(1);
      
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
    onlyVoters
    returns (bool)
  {
    require(_recipient != address(0));

    bytes32 _paramHash = keccak256(abi.encodePacked(_recipient, _value));
    if (voteHasPassed(Actions.TransferEther, _paramHash)) {
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
    onlyVoters
    returns (bool)
  {
    if (voteHasPassed(Actions.PauseToken, 0x0)) {
      token.pause();
    }

    return true;
  }

  /**
    @notice unpauses the token contrct, enabling transfers
   */
  function unpauseToken()
    external
    onlyVoters
    returns (bool)
  {
    if (voteHasPassed(Actions.UnpauseToken, 0x0)) {
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
    onlyVoters
    returns (bool)
  {
    require( block.timestamp > tokenReleaseDate);

    bytes32 _paramHash = keccak256(abi.encodePacked(_recipient, _value));
    if (voteHasPassed(Actions.TransferTokens, _paramHash)) {
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
    onlyVoters
    returns (bool)
  {
    require(!isVoter[_newVoter]);

    bytes32 _paramHash = keccak256(abi.encodePacked(_newVoter));
    if (voteHasPassed(Actions.AddVoter, _paramHash)) {
      isVoter[_newVoter] = true;
      voterCount = voterCount.add(1);

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
    onlyVoters
    returns (bool)
  {
    require(isVoter[_voter]);
    require(voterCount.sub(1) >= minimumVotes);
    bytes32 _paramHash = keccak256(abi.encodePacked(_voter));
    if (voteHasPassed(Actions.RemoveVoter, _paramHash)) {
      isVoter[_voter] = false;
      voterCount = voterCount.sub(1);

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
    onlyVoters
    returns (bool)
  {
    require(_minimumVotes > 1);
    require(_minimumVotes <= voterCount);
    bytes32 _paramHash = keccak256(abi.encodePacked(_minimumVotes));
    if (voteHasPassed(Actions.UpdateMinimumVotes, _paramHash)) {
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