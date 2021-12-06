const ChainLinkFeedABI = [
  {
    inputs: [],
    name: 'latestAnswer',
    inputs: [{internalType: 'address', type: 'address', name: '_token'}],
    name: 'getPrice',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

module.exports = ChainLinkFeedABI;
