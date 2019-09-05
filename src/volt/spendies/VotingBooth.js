
const { bufferToHex, ripemd160 } = require("ethereumjs-util");

const code = '0x608060405234801561001057600080fd5b50600436106100395760e060020a60003504635ca740ab811461003e5780636b0f34061461007b575b600080fd5b6100796004803603608081101561005457600080fd5b50600160a060020a038135169060ff602082013516906040810135906060013561012b565b005b6100796004803603608081101561009157600080fd5b81359190810190604081016020820135602060020a8111156100b257600080fd5b8201836020820111156100c457600080fd5b803590602001918460018302840111602060020a831117156100e557600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955050823593505050602001356102ff565b60008061013a308686866107cc565b909250905060018215151461018d576040805160e560020a62461bcd02815260206004820152600e6024820152609260020a6d1c9958dbdd995c8819985a5b195902604482015290519081900360640190fd5b600160a060020a038116730d56caf1ccb9eddf27423a1d0f8960554e7bc9d5146101fc576040805160e560020a62461bcd0281526020600482015260156024820152605b60020a740e6d2cedccae440c8decae640dcdee840dac2e8c6d02604482015290519081900360640190fd5b6040805160e060020a6370a08231028152306004820181905291518892600160a060020a0384169263a9059cbb9284916370a08231916024808301926020929190829003018186803b15801561025157600080fd5b505afa158015610265573d6000803e3d6000fd5b505050506040513d602081101561027b57600080fd5b50516040805160e060020a63ffffffff8616028152600160a060020a03909316600484015260248301919091525160448083019260209291908290030181600087803b1580156102ca57600080fd5b505af11580156102de573d6000803e3d6000fd5b505050506040513d60208110156102f457600080fd5b505050505050505050565b6040805160e060020a6337ebbc0302815260048101869052905173cd1b3a9a7b5f84bc7829bc7e6e23adb1960bee979160009183916337ebbc03916024808301926020929190829003018186803b15801561035957600080fd5b505afa15801561036d573d6000803e3d6000fd5b505050506040513d602081101561038357600080fd5b505190506103988465deadbeef000187610809565b81146103e3576040805160e560020a62461bcd02815260206004820152600f6024820152608a60020a6e1c1c9bdbd9881b9bdd081d985b1a5902604482015290519081900360640190fd5b600084121561044657838312610441576040805160e560020a62461bcd0281526020600482015260186024820152604060020a7763616e206e6f74206465637265617365206e6f20766f746502604482015290519081900360640190fd5b6104a5565b60008413156104a5578383136104a5576040805160e560020a62461bcd0281526020600482015260196024820152603860020a7863616e206e6f742064656372656173652079657320766f746502604482015290519081900360640190fd5b8215156104f0576040805160e560020a62461bcd02815260206004820152600e6024820152609460020a6d063616e206e6f7420766f746520302604482015290519081900360640190fd5b600080841261051357734561111111111111111111111111111111111456610529565b7356711111111111111111111111111111111115675b90506000670de0b6b3a7640000868002868002030490506000738f8fdca55f0601187ca24507d4a1fe1b387db90b9050600085600160a060020a0316636352211e8b6040518263ffffffff1660e060020a0281526004018082815260200191505060206040518083038186803b1580156105a257600080fd5b505afa1580156105b6573d6000803e3d6000fd5b505050506040513d60208110156105cc57600080fd5b50516040805160e060020a6323b872dd028152600160a060020a0380841660048301528781166024830152604482018790529151929350908416916323b872dd916064808201926020929091908290030181600087803b15801561062f57600080fd5b505af1158015610643573d6000803e3d6000fd5b505050506040513d602081101561065957600080fd5b50733442c197cc858bed2476bdd9c7d4499552780f3d905063a9059cbb856106828b8b03610982565b6040518363ffffffff1660e060020a0281526004018083600160a060020a0316600160a060020a0316815260200182815260200192505050602060405180830381600087803b1580156106d457600080fd5b505af11580156106e8573d6000803e3d6000fd5b505050506040513d60208110156106fe57600080fd5b5050600160a060020a03861663a983d43f8b6107218a65deadbeef00018e610809565b6040518363ffffffff1660e060020a0281526004018083815260200182815260200192505050600060405180830381600087803b15801561076157600080fd5b505af1158015610775573d6000803e3d6000fd5b505060408051868152905160008b13935060019250600160a060020a038516917fe88d7264516faa76a22f83e03b5b21c08e92f286599e40b22fe89f5cc89b2e77919081900360200190a450505050505050505050565b60008060008060405188815287602082015286604082015285606082015260208160808360006001610bb8f1905190999098509650505050505050565b805160009060209060011901061580156108265750610122825111155b1515610876576040805160e560020a62461bcd0281526020600482015260146024820152606260020a731a5b9d985b1a59081c1c9bdbd988199bdc9b585d02604482015290519081900360640190fd5b6020820151600090859060029060f060020a900486845b6009811015610974576001831615156108a95760009550610910565b6020840193508361ffff16885110151515610909576040805160e560020a62461bcd0281526020600482015260156024820152605b60020a740e0e4dedecc40dcdee840d8dedcce40cadcdeeaced02604482015290519081900360640190fd5b8388015195505b8415801561091c575085155b1561092a5760009450610958565b60018216151561094857846000528560205260406000209450610958565b8560005284602052604060002094505b600261ffff8416049250600261ffff831604915060010161088d565b509298975050505050505050565b600080821215610998578160001902905061099b565b50805b91905056fea165627a7a7230582093c872ca612b5fa7c24abbdce05587d71bdc5638491e728cd6916f1317169ec70029';

const keys = {
  "VOICE_CREDITS": "1231111111111111111111111111111111111123",
  "VOICE_TOKENS": "2341111111111111111111111111111111111234",
  "BALANCE_CARD": "3451111111111111111111111111111111111345",
  "YES_BOX": "4561111111111111111111111111111111111456",
  "NO_BOX": "5671111111111111111111111111111111111567",
  "OPERATOR": "7891111111111111111111111111111111111789",
  "PROPOSAL_ID": "deadbeef0001"
};

const abi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "voter",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "MOTION_ID",
        "type": "uint16"
      },
      {
        "indexed": true,
        "name": "isYes",
        "type": "bool"
      },
      {
        "indexed": false,
        "name": "placedVotes",
        "type": "uint256"
      }
    ],
    "name": "NewVote",
    "type": "event"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "balanceCardId",
        "type": "uint256"
      },
      {
        "name": "proof",
        "type": "bytes"
      },
      {
        "name": "placedVotes",
        "type": "int256"
      },
      {
        "name": "newVotes",
        "type": "int256"
      }
    ],
    "name": "castBallot",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "token",
        "type": "address"
      },
      {
        "name": "v",
        "type": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "consolidate",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const withParams = (code) => (params) => {
  let codeCopy = code;
  Object.keys(params).forEach((k) => {
    codeCopy = replaceAll(codeCopy, keys[k], params[k]);
  });
  return { 
    address: bufferToHex(ripemd160(codeCopy)),
    code: codeCopy,
    keys,
    abi,
    withParams: withParams(codeCopy),
  };
};

const replaceAll = (str, find, replace) =>
  str.replace(new RegExp(find, "g"), replace.replace("0x", "").toLowerCase());
    
module.exports = { 
  address: '0xa4f5f48d19e034de366952a27d44ce00253b8de7',
  code,
  keys,
  abi,
  withParams: withParams(code)
};