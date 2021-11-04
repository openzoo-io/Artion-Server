const ERC721ABI = {
  RPC: 'https://gwan-ssl.wandevs.org:46891',
  CHAINID: 999,
  ABI: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'from',
          type: 'address'
        },
        { indexed: true, internalType: 'address', name: 'to', type: 'address' },
        {
          indexed: true,
          internalType: 'uint256',
          name: 'tokenId',
          type: 'uint256'
        }
      ],
      name: 'Transfer',
      type: 'event'
    }
  ]
};

module.exports = ERC721ABI;
