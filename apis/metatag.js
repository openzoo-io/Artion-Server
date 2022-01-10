const router = require('express').Router();
const { sortBy } = require('lodash');
const orderBy = require('lodash.orderby');
const mongoose = require('mongoose');
const ERC721CONTRACT = mongoose.model('ERC721CONTRACT');
const ERC1155CONTRACT = mongoose.model('ERC1155CONTRACT');
const NFTITEM = mongoose.model('NFTITEM');
const Collection = mongoose.model('Collection');
const Account = mongoose.model('Account');
const ERC1155HOLDING = mongoose.model('ERC1155HOLDING');
const Category = mongoose.model('Category');
const Bid = mongoose.model('Bid');
const Offer = mongoose.model('Offer');
const TradeHistory = mongoose.model('TradeHistory');
const Listing = mongoose.model('Listing');
const Auction = mongoose.model('Auction');
const Bundle = mongoose.model('Bundle');
const Like = mongoose.model('Like');
const BundleLike = mongoose.model('BundleLike');

const toLowerCase = require('../utils/utils');
const Logger = require('../services/logger');

const service_auth = require('./middleware/auth.tracker');

const { getPrice, getDecimals } = require('../services/price.feed');

// Get Account page //
router.get('/account/:address', async (req, res) => {
  let address = toLowerCase(req.params.address);

  let account = await Account.findOne({ address: address });
  if (account) {
    return res.json({
      status: "success",
      data: {
        name: account.alias ? account.alias : address,
        description: account.bio ? account.bio : 'Global NFT MarketPlace Powered On Wanchain',
        image: account.imageHash? 'https://openzoo2.mypinata.cloud/ipfs/'+account.imageHash : 'https://openzoo.io/icon.png',
      },
    });
  } else {
    return res.status(400).json({
      status: "failed",
    });
  }

  

});


// Get Collection page //
router.get('/collection/:address', async (req, res) => {
  let address = toLowerCase(req.params.address);

  let collection = await Collection.findOne({
    erc721Address: address,
  });
  if (!collection)
  {
    return res.status(404).json({
      status: 'failed',
    });
  }

  return res.json({
    status: 'success',
    data: {
      name: collection.collectionName,
      description: collection.description,
      image: 'https://openzoo2.mypinata.cloud/ipfs/'+collection.logoImageHash,
    },
  });

});


// Get NFT Page //
router.get('/collection/:address/:tokenid', async (req, res) => {
  let address = toLowerCase(req.params.address);
  let tokenid = Math.floor(req.params.tokenid);

  if (!tokenid)
  {
    return res.status(404).json({
      status: 'failed',
    });
  }
  let token = await NFTITEM.findOne({
    contractAddress: address,
    tokenID: tokenid
  });
  let collection = await Collection.findOne({
    erc721Address: address,
  });
  if (!token || !collection)
  {
    return res.status(404).json({
      status: 'failed',
    });
  }

  return res.json({
    status: 'success',
    data: {
      name: token.name,
      description: collection.description,
      image: token.imageURL,
    },
  });

});

module.exports = router;
