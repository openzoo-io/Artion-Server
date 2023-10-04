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


const PAYTOKENS = process.env.NETWORK_CHAINID === "888" ? [
    {
      address: '0x6e11655d6aB3781C6613db8CB1Bc3deE9a7e111F',
      name: 'ZOO',
      symbol: 'ZOO',
      decimals: 18,
    },
    {
      address: '0xdabd997ae5e4799be47d6e69d9431615cba28f48',
      name: 'WWAN',
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
    {
      address: '0x890589dC8BD3F973dcAFcB02b6e1A133A76C8135',
      name: 'ZOO',
      symbol: 'ZOO',
      decimals: 18,
    },
    // {
    //   address: '0x830053DABd78b4ef0aB0FeC936f8a1135B68da6f',
    //   name: 'WASP',
    //   symbol: 'WASP',
    //   decimals: 18,
    // },
    {
      address: '0x3D5950287b45F361774E5fB6e50d70eEA06Bc167',
      name: 'wanUSDT',
      symbol: 'wanUSDT',
      decimals: 6,
    },
    // {
    //   address: '0x7fF465746e4F47e1CbBb80c864CD7DE9F13337fE',
    //   name: 'wanUSDC',
    //   symbol: 'wanUSDC',
    //   decimals: 6,
    // },
    // {
    //   address: '0x48344649B9611a891987b2Db33fAada3AC1d05eC',
    //   name: 'wanETH',
    //   symbol: 'wanETH',
    //   decimals: 18,
    // },
  ]

module.exports = { PAYTOKENS, DISABLED_PAYTOKENS };
