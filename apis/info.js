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
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 120, checkperiod: 0 });

// Show total volume traded //
router.get('/totalVolumeTraded', async (_, res) => {
  let volumeTraded = await TradeHistory.aggregate([{ $group: { _id: null, sum: { $sum: "$priceInUSD" } } }])
  return res.json({
    status: 'success',
    data: volumeTraded
  });
});

// Show verified Collections //
router.get('/totalCollections', async (_, res) => {
  let collections = await Collection.aggregate([{ $group: { _id: null, n: { $sum: 1 } } }]) // {$match:{isVerified:true}},
  return res.json({
    status: 'success',
    data: collections
  });
});

// list the newly minted 10 tokens
router.get('/getNewestTokens', async (_, res) => {
  let tokens = await NFTITEM.find().sort({ createdAt: 1 }).limit(20);
  return res.json({
    status: 'success',
    data: tokens
  });
});

router.get('/getNewestAuctions', async (_, res) => {
  let auctions = await Auction.find().sort({ endTime: 1 }).limit(10);
  if (auctions)
    return res.json({
      status: 'success',
      data: auctions
    });
  else
    return res.json({
      status: 'success',
      data: []
    });
});

const sortItems = (_allTokens, sortby) => {
  let tmp = [];
  switch (sortby) {
    case 'popularity': {
      tmp = orderBy(
        _allTokens,
        ({ liked }) => liked || 0,
        ['desc']
      );
      break;
    }
    case 'name': {
      tmp = orderBy(
        _allTokens,
        ({ collectionName }) => collectionName.toLowerCase(),
        ['asc']
      );
      break;
    }
    case 'item': {
      tmp = orderBy(
        _allTokens,
        ({ item_count }) => item_count || 0,
        ['desc']
      );
      break;
    }
    case 'owner': {
      tmp = orderBy(
        _allTokens,
        ({ owner_count }) => owner_count || 0,
        ['desc']
      );
      break;
    }
    case 'volume': {
      tmp = orderBy(
        _allTokens,
        ({ traded_volume }) => traded_volume || 0,
        ['desc']
      );
      break;
    }

  }
  return tmp;
};


router.post('/getProfileCollectionList', async (req, res) => {
  let owner = toLowerCase(req.body.owner);
  allCollections = await Collection.find({
    isAppropriate: true,
    owner: owner,
  });

  let searchResults = allCollections.map(async (collection) => ({
    address: collection.erc721Address,
    collectionName: collection.collectionName,
    description: collection.description,
    categories: collection.categories,
    logoImageHash: collection.logoImageHash,
    siteUrl: collection.siteUrl,
    discord: collection.discord,
    twitterHandle: collection.twitterHandle,
    mediumHandle: collection.mediumHandle,
    telegram: collection.telegram,
    isVerified: collection.isVerified,
    isVisible: true,
    isInternal: collection.isInternal,
    isOwnerble: collection.isOwnerble,
    owner: collection.owner,
    ownerAlias: await getAccountInfo(collection.owner),
    item_count: await NFTITEM.countDocuments({ contractAddress: collection.erc721Address }),
    owner_count: await getCollectionOwnerCount(collection.erc721Address),
    floor_price: await getCollectionFloorPrice(collection.erc721Address),
    traded_volume: await getCollectionTradedVolume(collection.erc721Address),
    liked: await getCollectionLiked(collection.erc721Address),
    collectionType: await NFTITEM.find({ contractAddress: collection.erc721Address }).select('tokenType').limit(1)
  }));

  let results = await Promise.all(searchResults);

  // Do sorting by Created at //
  results = results.reverse();

  return res.json({
    status: 'success',
    data: {
      collections: results,
      total: results.length
    }
  });

});

router.post('/getCollectionList', async (req, res) => {
  let isVerified = req.body.isVerified;
  let sortedBy = req.body.sortedBy;
  let from = req.body.start;
  let count = req.body.count;
  let allCollections = [];
  if (isVerified == true) {
    allCollections = await Collection.find({
      isAppropriate: true,
      isVerified: true,
    });
  }
  else {
    allCollections = await Collection.find({
      isAppropriate: true,
    });
  }

  let searchResults = allCollections.map(async (collection) => {
    let item_count = await NFTITEM.countDocuments({ contractAddress: collection.erc721Address });
    return ({
      address: collection.erc721Address,
      collectionName: collection.collectionName,
      description: collection.description,
      categories: collection.categories,
      logoImageHash: collection.logoImageHash,
      siteUrl: collection.siteUrl,
      discord: collection.discord,
      twitterHandle: collection.twitterHandle,
      mediumHandle: collection.mediumHandle,
      telegram: collection.telegram,
      isVerified: collection.isVerified,
      isVisible: true,
      isInternal: collection.isInternal,
      isOwnerble: collection.isOwnerble,
      owner: collection.owner,
      ownerAlias: await getAccountInfo(collection.owner),
      item_count: item_count,
      owner_count: await getCollectionOwnerCount(collection.erc721Address),
      floor_price: await getCollectionFloorPrice(collection.erc721Address),
      traded_volume: await getCollectionTradedVolume(collection.erc721Address),
      liked: await getCollectionLiked(collection.erc721Address, item_count),
      collectionType: await NFTITEM.find({ contractAddress: collection.erc721Address }).select('tokenType').limit(1)
    })
  });

  let results = await Promise.all(searchResults);

  // Do sorting //
  if (sortedBy) {
    if (sortedBy === 'created') {
      results = results.reverse();
    }
    else {
      results = sortItems(results, sortedBy);
    }
  }

  const stickylist = [
    '0x992e4447f470ea47819d677b84d2459677bfdadf',
    '0x38034b2e6ae3fb7fec5d895a9ff3474ba0c283f6',
    '0xa67213608db9d4bffac75bad01ca5b1f4ad0724c',
    '0x1bc6895f67456e98ee400e48bc285b750ff4e348' // Testnet Usagi
  ]
  let official = [];
  let nonofficial = [];

  results.map(item => {
    if (
      stickylist.indexOf(item.address) !== -1
    ) {
      official.push(item);
    } else {
      nonofficial.push(item);
    }
  });

  results = [...official, ...nonofficial];

  // Remove all zero NFT categories //
  results = results.filter(i => i.item_count);

  // Before filter //
  let countRersults = results;

  results = results.slice(from, from + count);

  return res.json({
    status: 'success',
    data: {
      collections: results,
      total: countRersults.length
    }
  });
});


router.get('/sitemap', async (_, res) => {
  let tokens = await NFTITEM.find({
    isAppropriate: true
  })
    .select([
      'contractAddress',
      'tokenID',
    ]);
  let result = "<?xml version='1.0' encoding='UTF-8'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>";

  result += '<url><loc>https://openzoo.io</loc></url>';
  result += '<url><loc>https://openzoo.io/explore</loc></url>';
  result += '<url><loc>https://openzoo.io/collections</loc></url>';

  tokens.map(v => {
    result += '<url><loc>https://openzoo.io/collection/' + v.contractAddress + '/' + v.tokenID + '</loc></url>';
  });

  let allCollections = await Collection.find({
    status: true,
    isAppropriate: true
  }).select([
    'erc721Address',

  ]);
  allCollections.map(v => {
    result += '<url><loc>https://openzoo.io/collection/' + v.erc721Address + '</loc></url>';
  });
  result += "</urlset>";
  res.set('Content-Type', 'text/xml');
  return res.send(result);
});


router.get('/getWarnedCollections', async (_, res) => {
  let allWarnedContracts = myCache.get("allWarnedContracts");
  if (allWarnedContracts == undefined) {
    console.log('retriving... all warned collections');
    let allWarnedCollections = await Collection.find({
      isWarned: true,
    }).select("erc721Address");
    allWarnedContracts = [];
    allWarnedCollections.map(item => {
      allWarnedContracts.push(
        item.erc721Address,
      );
    });
    myCache.set("allWarnedContracts", allWarnedContracts);
  }
  return res.json({
    status: 'success',
    data: allWarnedContracts
  });
})

router.get('/getCollections', async (_, res) => {

  let allContracts = myCache.get("allContracts");

  if (allContracts == undefined) {
    console.log('retriving... all collections');
    let collections_721 = await ERC721CONTRACT.find({ isAppropriate: true });
    let collections_1155 = await ERC1155CONTRACT.find({ isAppropriate: true });

    let all = new Array();
    allContracts = new Array();
    all.push(...collections_721);
    all.push(...collections_1155);
    all = sortBy(all, 'name', 'desc');
    let allCollections = await Collection.find({
      status: true,
      isAppropriate: true
    });

    let savedAddresses = [];

    allCollections.map((collection) => {
      savedAddresses.push(collection.erc721Address);
      allContracts.push({
        address: collection.erc721Address,
        collectionName: collection.collectionName,
        description: collection.description,
        categories: collection.categories,
        logoImageHash: collection.logoImageHash,
        siteUrl: collection.siteUrl,
        discord: collection.discord,
        twitterHandle: collection.twitterHandle,
        mediumHandle: collection.mediumHandle,
        telegram: collection.telegram,
        isVerified: collection.isVerified,
        isVisible: true,
        isInternal: collection.isInternal,
        isOwnerble: collection.isOwnerble
      });
    });

    all.map((contract) => {
      if (!savedAddresses.includes(contract.address)) {
        savedAddresses.push(contract.address);
        allContracts.push({
          address: contract.address,
          name: contract.name != 'name' ? contract.name : '',
          symbol: contract.symbol != 'symbol' ? contract.symbol : '',
          logoImageHash: contract.logoImageHash,
          isVerified: contract.isVerified,
          isVisible: contract.isVerified
        });
      }
    });
    myCache.set("allContracts", allContracts);
  }


  return res.json({
    status: 'success',
    data: allContracts
  });
});

router.post('/searchNames', async (req, res) => {
  try {
    let name = req.body.name;
    // get account
    let accounts = await Account.find({
      alias: { $regex: name, $options: 'i' }
    })
      .select(['address', 'imageHash', 'alias'])
      .limit(3);
    let collections = await Collection.find({
      collectionName: { $regex: name, $options: 'i' },
      isAppropriate: true
    })
      .select(['erc721Address', 'collectionName', 'logoImageHash', 'isVerified'])
      .limit(3);
    let tokens = await NFTITEM.find({
      name: { $regex: name, $options: 'i' },
      isAppropriate: true
    })
      .select([
        'contractAddress',
        'tokenID',
        'tokenURI',
        'name',
        'thumbnailPath',
        'imageURL'
      ])
      .limit(10);

    let bundles = await Bundle.find({
      name: { $regex: name, $options: 'i' }
    })
      .select(['name', '_id'])
      .limit(10);
    let data = { accounts, collections, tokens, bundles };
    return res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    Logger.error(error);
    return res.json([]);
  }
});

router.get('/getOwnership/:address/:tokenID', async (req, res) => {
  try {
    let collection = toLowerCase(req.params.address);
    let tokenID = parseInt(req.params.tokenID);
    let holdings = await ERC1155HOLDING.find({
      contractAddress: collection,
      tokenID: tokenID
    }).select(['holderAddress', 'supplyPerHolder']);

    let users = [];
    let promise = holdings.map(async (hold) => {
      if (hold.supplyPerHolder > 0) {
        let account = await Account.findOne({
          address: hold.holderAddress
        });
        if (account) {
          users.push({
            address: account.address,
            alias: account.alias,
            imageHash: account.imageHash,
            supply: hold.supplyPerHolder
          });
        } else {
          users.push({
            address: hold.holderAddress,
            supply: hold.supplyPerHolder
          });
        }
      }
    });
    await Promise.all(promise);

    let _users = orderBy(users, 'supply', 'desc');
    return res.json({
      status: 'success',
      data: _users
    });
  } catch (error) {
    Logger.error(error);
    return res.json([]);
  }
});

router.get('/get1155info/:address/:tokenID', async (req, res) => {
  try {
    let collection = toLowerCase(req.params.address);
    let tokenID = parseInt(req.params.tokenID);
    let holdings = await ERC1155HOLDING.find({
      contractAddress: collection,
      tokenID: tokenID,
      supplyPerHolder: { $gt: 0 }
    });
    let count = holdings.length;
    let token = await NFTITEM.findOne({
      contractAddress: collection,
      tokenID: tokenID
    });
    let totalSupply = token.supply;
    return res.json({
      status: 'success',
      data: {
        holders: count,
        totalSupply: totalSupply
      }
    });
  } catch (error) {
    Logger.error(error);
    return res.json([]);
  }
});

router.get('/getAccountActivity/:address', async (req, res) => {
  let tokenTypes = await Category.find();
  tokenTypes = tokenTypes.map((tt) => [tt.minterAddress, tt.type]);

  let address = toLowerCase(req.params.address);

  let bids = [];
  let offers = [];
  let listings = [];
  let sold = [];

  let bidsFromAccount = await Bid.find({
    bidder: address
  });
  let offersFromAccount = await Offer.find({
    creator: address
  });
  let listsFromAccount = await Listing.find({
    owner: address
  });
  let salesFromAccount = await TradeHistory.find({ from: address });

  if (bidsFromAccount) {
    let bidsPromise = bidsFromAccount.map(async (bfa) => {
      let token = await NFTITEM.findOne({
        contractAddress: bfa.minter,
        tokenID: bfa.tokenID
      });
      if (token) {
        let account = await getAccountInfo(token.owner);
        bids.push({
          event: 'Bid',
          contractAddress: token.contractAddress,
          tokenID: token.tokenID,
          name: token.name,
          tokenURI: token.tokenURI,
          thumbnailPath: token.thumbnailPath,
          imageURL: token.imageURL,
          to: token.owner,
          price: bfa.bid,
          paymentToken: bfa.paymentToken,
          quantity: bfa.quantity,
          createdAt: bfa._id.getTimestamp(),
          alias: account ? account[0] : null,
          image: account ? account[1] : null,
          txHash: bfa.txHash
        });
      }
    });

    await Promise.all(bidsPromise);
  }
  if (offersFromAccount) {
    let offersPromise = offersFromAccount.map(async (ofa) => {
      let token = await NFTITEM.findOne({
        contractAddress: ofa.minter,
        tokenID: ofa.tokenID
      });
      if (token) {
        let account = await getAccountInfo(token.owner);
        offers.push({
          event: 'Offer',
          contractAddress: token.contractAddress,
          tokenID: token.tokenID,
          name: token.name,
          tokenURI: token.tokenURI,
          thumbnailPath: token.thumbnailPath,
          imageURL: token.imageURL,
          to: token.owner,
          quantity: ofa.quantity,
          price: ofa.pricePerItem,
          paymentToken: ofa.paymentToken,
          createdAt: ofa._id.getTimestamp(),
          alias: account ? account[0] : null,
          image: account ? account[1] : null,

        });
      }
    });
    await Promise.all(offersPromise);
  }
  if (listsFromAccount) {
    let listsPromise = listsFromAccount.map(async (lfa) => {
      let token = await NFTITEM.findOne({
        contractAddress: lfa.minter,
        tokenID: lfa.tokenID
      });
      if (token) {
        let account = await getAccountInfo(token.owner);
        listings.push({
          event: 'Listing',
          contractAddress: token.contractAddress,
          tokenID: token.tokenID,
          name: token.name,
          tokenURI: token.tokenURI,
          thumbnailPath: token.thumbnailPath,
          imageURL: token.imageURL,
          to: token.owner,
          quantity: lfa.quantity,
          price: lfa.price,
          paymentToken: lfa.paymentToken,
          createdAt: lfa._id.getTimestamp(),
          alias: account ? account[0] : null,
          image: account ? account[1] : null
        });
      }
    });
    await Promise.all(listsPromise);
  }

  if (salesFromAccount) {
    let soldPromise = salesFromAccount.map(async (sfa) => {
      let token = await NFTITEM.findOne({
        contractAddress: sfa.collectionAddress,
        tokenID: sfa.tokenID
      });

      if (token) {
        let account = await getAccountInfo(sfa.to);
        sold.push({
          event: 'Sold',
          contractAddress: token.contractAddress,
          tokenID: token.tokenID,
          name: token.name,
          tokenURI: token.tokenURI,
          thumbnailPath: token.thumbnailPath,
          imageURL: token.imageURL,
          to: sfa.to,
          quantity: sfa.value,
          price: sfa.price,
          paymentToken: sfa.paymentToken,
          createdAt: sfa._id.getTimestamp(),
          alias: account ? account[0] : null,
          image: account ? account[1] : null,
          txHash: sfa.txHash
        });
      }
    });
    await Promise.all(soldPromise);
  }

  return res.json({
    status: 'success',
    data: {
      bids,
      offers,
      listings,
      sold
    }
  });
});

router.get('/getOffersFromAccount/:address', async (req, res) => {
  try {
    let address = toLowerCase(req.params.address);
    let myOffers = await Offer.find({ creator: address });
    if (!myOffers)
      return res.json({
        status: 'success',
        data: []
      });
    let offers = [];
    let promise = myOffers.map(async (offer) => {
      let token = await NFTITEM.findOne({
        contractAddress: offer.minter,
        tokenID: offer.tokenID
      });
      let tokenType = token.tokenType;
      if (tokenType == 721) {
        let account = await getAccountInfo(token.owner);
        offers.push({
          contractAddress: offer.minter,
          tokenID: offer.tokenID,
          name: token.name,
          thumbnailPath: token.thumbnailPath,
          imageURL: token.imageURL,
          quantity: offer.quantity,
          pricePerItem: offer.pricePerItem,
          paymentToken: offer.paymentToken,
          deadline: offer.deadline,
          createdAt: offer._id.getTimestamp(),
          alias: account ? account[0] : null,
          image: account ? account[1] : null
        });
      } else {
        offers.push({
          contractAddress: offer.minter,
          tokenID: offer.tokenID,
          name: token.name,
          thumbnailPath: token.thumbnailPath,
          imageURL: token.imageURL,
          quantity: offer.quantity,
          pricePerItem: offer.pricePerItem,
          paymentToken: offer.paymentToken,
          deadline: offer.deadline,
          createdAt: offer._id.getTimestamp()
        });
      }
    });
    await Promise.all(promise);
    return res.json({
      status: 'success',
      data: offers
    });
  } catch (error) {
    Logger.error(error);
    return res.json({
      status: 'failed',
      data: []
    });
  }
});

router.get('/getActivityFromOthers/:address', async (req, res) => {
  try {
    let address = toLowerCase(req.params.address);
    /* get holding token [tokenID, minter] pair */
    let holdings = [];
    let offers = [];
    let tmp = await NFTITEM.find({
      owner: address
    }).select(['contractAddress', 'tokenID']);
    tmp.map((tk) => {
      holdings.push([tk.tokenID, tk.contractAddress]);
    });
    tmp = await ERC1155HOLDING.find({
      holderAddress: address
    }).select(['contractAddress', 'tokenID']);
    tmp.map((tk) => {
      holdings.push([tk.tokenID, tk.contractAddress]);
    });

    let promise = holdings.map(async (hold) => {

      // Find the higest price + Not expired //
      let offer = await Offer.findOne({
        minter: hold[1],
        tokenID: hold[0],
        deadline: { $gte: new Date().getTime() }
      }).select([
        'creator',
        'tokenID',
        'quantity',
        'pricePerItem',
        'paymentToken',
        'deadline',
        'minter'
      ]).sort({ pricePerItem: -1 });

      // Back to Normal mode just select //
      if (!offer) {
        offer = await Offer.findOne({
          minter: hold[1],
          tokenID: hold[0],
        }).select([
          'creator',
          'tokenID',
          'quantity',
          'pricePerItem',
          'paymentToken',
          'deadline',
          'minter'
        ]).sort({_id: -1});
      }
      

      if (offer) {
        if (offer.creator != address) {
          let account = await getAccountInfo(offer.creator);
          let token = await NFTITEM.findOne({
            contractAddress: offer.minter,
            tokenID: offer.tokenID
          });
          offers.push({
            creator: offer.creator,
            contractAddress: offer.minter,
            tokenID: offer.tokenID,
            name: token.name,
            thumbnailPath: token.thumbnailPath,
            imageURL: token.imageURL,
            quantity: offer.quantity,
            pricePerItem: offer.pricePerItem,
            paymentToken: offer.paymentToken,
            deadline: offer.deadline,
            createdAt: offer._id.getTimestamp(),
            alias: account ? account[0] : null,
            image: account ? account[1] : null
          });
        }
      }
    });
    await Promise.all(promise);
    return res.json({
      status: 'success',
      data: offers
    });
  } catch (error) {
    Logger.error(error);
    return res.status(400).json({
      status: 'failed'
    });
  }
});

router.get('/getFigures/:address', async (req, res) => {
  try {
    let address = toLowerCase(req.params.address);
    let singleItems721 = await NFTITEM.find({
      owner: address,
      isAppropriate: true,
      tokenType: 721,
      thumbnailPath: { $nin: ['.', 'non-image'] }
    });
    let single721 = singleItems721.length;
    let singleItems1155 = await ERC1155HOLDING.find({
      holderAddress: address,
      supplyPerHolder: { $gt: 0 }
    });
    let single1155 = singleItems1155.length;
    let single = single721 + single1155;
    let bundles = await Bundle.find({ owner: address });
    let bundle = bundles.length;
    let favNFT = await Like.find({ follower: address });
    let favBundle = await BundleLike.find({ follower: address });
    let fav = favNFT.length + favBundle.length;
    return res.json({
      status: 'success',
      data: {
        single,
        bundle,
        fav
      }
    });
  } catch (error) {
    Logger.error(error);
    return res.json({
      status: 'failed'
    });
  }
});

router.get('/price/:token', (req, res) => {
  try {
    let token = req.params.token;
    return res.json({
      status: 'success',
      data: getPrice(token)
    });
  } catch (error) {
    Logger.error(error);
    return res.json({
      status: 'failed'
    });
  }
});

router.get('/getDecimals/:address', async (req, res) => {
  try {
    let address = req.params.address;
    let decimal = await getDecimals(address);
    return res.json({
      data: decimal
    });
  } catch (error) {
    Logger.error(error);
    return res.json({
      data: 0
    });
  }
});

const getAccountInfo = async (address) => {
  try {
    let account = await Account.findOne({ address: address });
    if (account) {
      return [account.alias, account.imageHash];
    } else {
      return null;
    }
  } catch (error) {
    Logger.error(error);
    return null;
  }
};

const getCollectionLiked = async (address, totalCount) => {
  try {
    let liked = myCache.get('collectionLiked_' + address);

    if (liked == undefined) {
      //console.log('retrived liked...');
      // let likedSum = await NFTITEM.aggregate([
      //   {
      //     $match: { contractAddress: address }
      //   },
      //   {
      //     $group: {
      //       _id: null, sum: { $sum: "$liked" }
      //     },
      //   }
      // ]);

      let likedSum = await Like.aggregate([
        {
          $match:
          {
            contractAddress: address
          }
        },
        {
          $group: { _id: { foll: "$follower" }, sum: { $sum: 1 } }
        },
        {
          $match:
          {
            sum: { $lte: Math.floor(totalCount / 2.5) }
          }
        },
        { $count: "sum" }
      ]);
      let liked = 0;
      if (likedSum.length > 0) {
        liked += likedSum[0].sum;
      }

      myCache.set('collectionLiked_' + address, liked);
      return liked;
    }
    return liked;

  } catch (error) {
    Logger.error(error);
    return 0;
  }
}

const getCollectionTradedVolume = async (address) => {
  try {
    let voltraded = myCache.get('collectionVolume_' + address);

    if (voltraded == undefined) {
      //console.log('retrived voltraded...');
      const TradeHistory = mongoose.model('TradeHistory');

      let volumeTradedAuction = await TradeHistory.find({
        collectionAddress: address,
        isAuction: true,
      });
      let volumeTradedSold = await TradeHistory.aggregate([
        {
          $match: { collectionAddress: address, isAuction: false }
        },
        {
          $group: {
            _id: null, sum: { $sum: "$priceInUSD" }
          },
        }
      ]);
      let voltraded = 0;
      if (volumeTradedAuction.length > 0) {

        volumeTradedAuction.map(item => {
          voltraded += item.priceInUSD * item.price;
        });
      }
      if (volumeTradedSold.length > 0) {
        voltraded += volumeTradedSold[0].sum;
      }
      myCache.set('collectionVolume_' + address, voltraded, 600); // 10 mins
      return voltraded;
    }
    return voltraded;

  } catch (error) {
    Logger.error(error);
    return 0;
  }
}

const getCollectionFloorPrice = async (address) => {
  try {
    // Floor Price //
    let floorPriceNFT = await NFTITEM.find({ contractAddress: address, priceInUSD: { $gt: 0 }, listedAt: {$gte:  new Date(new Date().setDate(new Date().getDate() - 150))} }).sort({ priceInUSD: 1 }).limit(1)
    //console.log(floorPriceNFT[0].priceInUSD);
    let floorPrice = 0;
    if (floorPriceNFT.length > 0) {
      floorPrice = floorPriceNFT[0].priceInUSD;
    }
    return floorPrice;
  } catch (error) {
    Logger.error(error);
    return 0;
  }
}

const getCollectionOwnerCount = async (address) => {
  try {
    // Count Owner //
    let countOwner = await NFTITEM.aggregate([
      {
        $match: { contractAddress: address }
      },
      {
        $group: {
          _id: "$owner", count: { $sum: 1 }
        },
      },
      {
        $facet: { totalCount: [{ $count: 'ownerCount' }] }
      }
    ]);
    if (countOwner.length > 0 && countOwner[0].totalCount[0]?.ownerCount) {
      countOwner = countOwner[0].totalCount[0].ownerCount;
    }
    else {
      countOwner = 0;
    }

    // Count Owner from 1155 //
    //let countOwner1155 = await ERC1155HOLDING.countDocuments({ contractAddress: address });
    let countOwner1155 = await ERC1155HOLDING.aggregate([{ $match: { contractAddress: address } }, { "$group": { _id: "$holderAddress" } }])
    if (countOwner1155.length > 0) {
      countOwner = countOwner1155.length;
    }
    return countOwner;
  } catch (error) {
    Logger.error(error);
    return 0;
  }
};
module.exports = router;
