pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";


contract ExampleToken is MintableToken {
  string public name;
  string public symbol;
  uint256 public decimals;

  constructor(
    string _name,
    string _symbol,
    uint256 _decimals
  )
    public
  {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
  }
}