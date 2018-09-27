# Multi-Sig Vote Contract
This contract implements an easy to use voting system which can easily be verified and understood as opposed to something like [ethereum.org's dao implementation](https://ethereum.org/dao) where transaction payloads are being used.

This implementation ensures that the voters know more clearly what they are voting on. 

**pros**
* a more clear voting system
* users with minimal technical knowledge can see what they are voting on
* no need for creating a tx payload to vote on/verify
* easy to extend for additional functionality

**cons**
* not as dynamic and flexible as [ethereum.org's dao implementation](https://ethereum.org/dao)
    * this can still be somewhat mitigated through an upgradeable proxy
        * voters vote on upgrading to new master implementation which contains new voting options
        * vote passes and the contract is upgraded allowing for new voting options
        * rinse and repeat as needed
* no way to easily check vote counts
    * this can be remedied through DApp where correct hashes can be calculated for vote counts, then retrieved from `actionVotes`
    * this could also be done with a special view function for each vote possibility...
    * this could also be remedied through events, though it would still require an event for each action.

## Use Cases
This contract would be meant for a rather close knit group who can agree on performing an action previous to casting votes.
An example of this would be perhaps management of a company which controls owner permissions of a a smart contract ecosystem. This contract (once audited) could the serve as a replacement for a secure single owner account system.

### Example of Use
1. Company X has mostly finished development of their ecosystem. They will need an owner who can do special permissioned actions such as pausing or unpausing a token.
1. They have decided that keeping a single account safe is too much of a risk and would rather have 5 different accounts which could vote together in order to perform owner actions.
1. Company X uses VotableOwner contract as the owner. 
1. They deploy the contract and set 5 different managers as voters. 
1. They set minimum votes to 3 for performing an action. 
    * This allows for up to two of the private keys being lost. 
    * These accounts can be removed by vote of the remaining 3 voters. 
    * Other accounts can be added as replacements.
1. Company X sets the owner of the their token to the VotableOwner contract.
1. Later down the road, Company X decides they need to pause the token for some reason.
1. Company X decides on the 3 people needed to vote.
1. All 3 of the voters run `pauseToken()`
1. The token is paused & voting is reset.

As stated in the previous section... a DApp could be built in house for this contract which could at least check on vote counts. This would allow for this contract to work with a less closely knit team or group.

## How it Works


## Possible Future work
There is definitely a problem here where it is rather difficult to track vote counts currently. It might be better to change it so that after ANY vote has passed, the vote count is reset. This way there would be no accidental actions being performed earlier than anticipated due to lingering votes from previous votes. However, as stated earlier, if this is used by a closely knit team which uses a simple DApp for vote counts, it should not be a serious issue.

## Gas Usage
·----------------------------------------------------------------------|----------------------------·
|                                 Gas                                  ·  Block limit: 6721975 gas  │
········································|······························|·····························
|  Methods                              ·         10 gwei/gas          ·       182.90 eur/eth       │
·················|······················|·········|··········|·········|·············|···············
|  Contract      ·  Method              ·  Min    ·  Max     ·  Avg    ·  # calls    ·  eur (avg)   │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  approve             ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  decreaseApproval    ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  finishMinting       ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  increaseApproval    ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  mint                ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  pause               ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  renounceOwnership   ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  transfer            ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  transferFrom        ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  transferOwnership   ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  ExampleToken  ·  unpause             ·      -  ·       -  ·      -  ·          0  ·           -  │
·················|······················|·········|··········|·········|·············|···············
|  VotableOwner  ·  addVoter            ·  68048  ·  100290  ·  84169  ·          2  ·        0.15  │
·················|······················|·········|··········|·········|·············|···············
|  VotableOwner  ·  pauseToken          ·  50605  ·   79966  ·  69876  ·         13  ·        0.13  │
·················|······················|·········|··········|·········|·············|···············
|  VotableOwner  ·  removeVoter         ·  55680  ·   70680  ·  67261  ·          7  ·        0.12  │
·················|······················|·········|··········|·········|·············|···············
|  VotableOwner  ·  transferEther       ·  68118  ·   82460  ·  75289  ·          2  ·        0.14  │
·················|······················|·········|··········|·········|·············|···············
|  VotableOwner  ·  transferTokens      ·  68544  ·  106505  ·  87525  ·          2  ·        0.16  │
·················|······················|·········|··········|·········|·············|···············
|  VotableOwner  ·  unpauseToken        ·  65649  ·   79853  ·  76302  ·          4  ·        0.14  │
·················|······················|·········|··········|·········|·············|···············
|  VotableOwner  ·  updateMinimumVotes  ·  66936  ·   78984  ·  72960  ·          4  ·        0.13  │
·----------------|----------------------|---------|----------|---------|-------------|--------------·

## Important Notes
This boilerplate uses the latest [truffle (v5.0.0-beta.0 – Chocolate Sushi)](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.0)!

This means that there are some significant differences which need to be considered when using this boilerplate. The most notable is the use of web3 version v1.0!

Due to the use of web3 v1.0, events need to be used through websockets which means that ganache-cli must be used (this may not be true... PRs are welcome!). Use `yarn start:blockchain` to use start ganache-cli before testing.

With the new version of web3 also comes a new big number library, `bn.js` (rather than `bignumber.js`)

This boilerplate uses yarn rather than npm. Change fork and change this locally if you want...

## Installing Dependencies
Everything can be installed through yarn.

`yarn`

## Using with your Code editor
For the best experience, make sure to install the following packages for the editor you are using:
* solium/solidity syntax
* eslint
* prettier

In Visual Studio Code this is:
* [solidity](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity)
* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Testing
First start the local blockchain:
```
yarn start:blockchain
```

Then start the tests:
```
yarn test
```

### Testing with Gas Reporting
First start the local blockchain:
```
yarn start:blockchain
```

Then start the tests:
```
yarn test:gas-reporter
```

You will get a nice summary table at the end of testing indicating gas costs of deployment and state changing functions:
```
·----------------------------------------------------------------|----------------------------·
|                              Gas                               ·  Block limit: 6721975 gas  │
·································································|·····························
|  Methods                                                                                    │
················|····················|·······|·······|···········|··············|··············
|  Contract     ·  Method            ·  Min  ·  Max  ·  Avg      ·  # calls     ·  eur (avg)  │
················|····················|·······|·······|···········|··············|··············
|  ExampleCoin  ·  approve           ·    -  ·    -  ·        -  ·           0  ·          -  │
················|····················|·······|·······|···········|··············|··············
|  ExampleCoin  ·  decreaseApproval  ·    -  ·    -  ·        -  ·           0  ·          -  │
················|····················|·······|·······|···········|··············|··············
|  ExampleCoin  ·  increaseApproval  ·    -  ·    -  ·        -  ·           0  ·          -  │
················|····················|·······|·······|···········|··············|··············
|  ExampleCoin  ·  transfer          ·    -  ·    -  ·    51867  ·           1  ·          -  │
················|····················|·······|·······|···········|··············|··············
|  ExampleCoin  ·  transferFrom      ·    -  ·    -  ·        -  ·           0  ·          -  │
················|····················|·······|·······|···········|··············|··············
|  Deployments                       ·                           ·  % of limit  ·             │
·····································|·······|·······|···········|··············|··············
|  ExampleCoin                       ·    -  ·    -  ·  1480604  ·        22 %  ·          -  │
·------------------------------------|-------|-------|-----------|--------------|-------------·
```

## Deploying Contracts
The migrations files are setup to use `async/await` in order to make extending the migrations into something more complicated quite simple. The new version of truffle has updated the way it handles migrations so this is less problematic now.

The boilerplate comes with `truffle-hdwallet-provider` already setup. You just need to set a mnemonic in your .env file (not included. See .env.example for an example). All of the testnet deployments use the same mnemonic. Mainnet uses a different one.

After you have set a mnemonic, you can use the appropriate script in `package.json`:

### Kovan Deployment
```
yarn migrate:kovan
```

### Ropsten Deployment
```
yarn migrate:ropsten
```

### Rinkeby Deployment
```
yarn migrate:rinkeby
```

### Mainnet Deployment
```
yarn migrate:mainnet
```