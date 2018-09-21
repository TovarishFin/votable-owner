pragma solidity ^0.4.24;


interface IPausableToken {
  function totalSupply() 
    external 
    view 
    returns (uint256);

  function balanceOf(
    address _who
  ) 
    external 
    view 
    returns (uint256);

  function transfer(
    address _to, 
    uint256 _value
  ) 
    external 
    returns (bool);

  function allowance(
    address _owner, 
    address _spender
  )
    external 
    view 
    returns (uint256);

  function transferFrom(
    address _from, 
    address _to, 
    uint256 _value
  )
    external 
    returns (bool);

  function approve(
    address _spender, 
    uint256 _value
  ) 
    external 
    returns (bool);

  function owner()
    external
    view
    returns (address);

  function renounceOwnership() 
    external;

  function transferOwnership(address _newOwner) 
    external;

  function paused()
    external
    view
    returns (bool);

  function pause() 
    external;

  function unpause() 
    external;
}