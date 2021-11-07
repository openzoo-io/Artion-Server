const DISABLED_PAYTOKENS = process.env.NETWORK_CHAINID === "250" ? [
    {
      address: '0x0000000000000000000000000000000000000000',
      name: 'Fantom',
      symbol: 'ftm',
      decimals: 18,
    }
  ] :
  [
    {
      address: '0x0000000000000000000000000000000000000000',
      name: 'Fantom',
      symbol: 'ftm',
      decimals: 18,
    }
  ]


const PAYTOKENS = process.env.NETWORK_CHAINID === "999" ? [
    {
      address: '0xdabd997ae5e4799be47d6e69d9431615cba28f48',
      name: 'Wrapped Wanchain',
      symbol: 'WWAN',
      decimals: 18,
    }
  ] :
  [
    {
      address: '0x916283cc60fdaf05069796466af164876e35d21f',
      name: 'Wrapped Wanchain',
      symbol: 'WWAN',
      decimals: 18,
    },
  ]

module.exports = { PAYTOKENS, DISABLED_PAYTOKENS };
