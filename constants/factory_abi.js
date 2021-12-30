const CollectionFactoryContract = {
  MAINNET_721_PRIVATE: '0xB3E21271194b2F6F6DA79E676e1fBC8aa088Bcfb', //FantomNFTFactoryPrivate
  MAINNET_721_PUBLIC: '0x8a5537bf123d95d0908be54ED46551bD41b36db7', //FantomNFTFactory
  TESTNET_721_PRIVATE: '0xB628A26232F5E24B771D268C8680877DA9e8D209', //FantomNFTFactoryPrivate
  TESTNET_721_PUBLIC: '0x94e75dD5194b4Cd800fF8DB232dE2500ee3E785f', //FantomNFTFactory
  MAINNET_1155_PRIVATE: '0x3e070bE392D6a54D4A9AF51d4A476f951aA3993B', //FantomArtFactoryPrivate
  MAINNET_1155_PUBLIC: '0xa91D2825828BD40Ead230db7649F0bb8bAF894Cb', //FantomArtFactory
  TESTNET_1155_PRIVATE: '0xCaa6ff4Db9a762dcdc725D69DD5d9B392A66d933', //FantomArtFactoryPrivate
  TESTNET_1155_PUBLIC: '0x01C619F89247284268DA8837ffEE8fBb5a78eA22', //FantomArtFactory
  ABI: [
    {
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'exists',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function'
    }
  ]
};

module.exports = CollectionFactoryContract;
