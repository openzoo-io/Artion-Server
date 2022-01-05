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


// Show total volume traded //

router.get('/collection/:address/:tokenid', async (req, res) => {
  let address = toLowerCase(req.params.address);
  let tokenid = Math.floor(req.params.tokenid);
  console.log(address, tokenid);
  if (!tokenid)
  {
    return res.redirect('https://openzoo.io/404');
  }
  let token = await NFTITEM.findOne({
    contractAddress: address,
    tokenID: tokenid
  });
  if (!token)
  {
    return res.redirect('https://openzoo.io/404');
  }
console.log('do return');
  res.setHeader('Content-type','text/html');
  return res.send(`<!doctype html>
  <html lang="en">
  <head>
  <title>${token.name} - OpenZoo</title>
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:image" content="${token.imageURL}" />
  </head>
  </html>`);
});

module.exports = router;
