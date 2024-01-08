require('dotenv').config();
const router = require('express').Router();
const ethers = require('ethers');

const mongoose = require('mongoose');
const NFTITEM = mongoose.model('NFTITEM');
const ERC1155HOLDING = mongoose.model('ERC1155HOLDING');
const Category = mongoose.model('Category');
const Collection = mongoose.model('Collection');
const Listing = mongoose.model('Listing');
const Offer = mongoose.model('Offer');
const Bid = mongoose.model('Bid');
const Auction = mongoose.model('Auction');
const Account = mongoose.model('Account');
const BundleInfo = mongoose.model('BundleInfo');
const Bundle = mongoose.model('Bundle');
const BundleListing = mongoose.model('BundleListing');
const BundleOffer = mongoose.model('BundleOffer');
const TradeHistory = mongoose.model('TradeHistory');
const UnlockableContents = mongoose.model('UnlockableContents');
const DisabledExplorerCollection = mongoose.model('DisabledExplorerCollection');
const NFTAttribute = mongoose.model('NFTAttribute');

const orderBy = require('lodash.orderby');
const toLowerCase = require('../utils/utils');

const { getPrice } = require('../services/price.feed');
const sortBy = require('lodash.sortby');
const Logger = require('../services/logger');
const { MAX_INTEGER } = require('ethereumjs-util');

const requestIP = require("request-ip");
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 15, checkperiod: 0 });

const provider = new ethers.providers.JsonRpcProvider(
  process.env.NETWORK_RPC,
  parseInt(process.env.NETWORK_CHAINID)
);

const nonImage = 'non-image';

const formatPrice = (price = 0, payToken) => {
  if (
    payToken === process.env.PRICE_USDC ||
    payToken === process.env.PRICE_FUSDT
  ) {
    return price / 1e12;
  }

  return price;
};

const updatePrices = (items) => {
  items.map((item) => {
    item.currentPriceInUSD = item.price * getPrice(item.paymentToken);
    item.lastSalePriceInUSD =
      item.lastSalePrice * getPrice(item.lastSalePricePaymentToken);
  });

  return items;
};



router.post('/increaseViews', async (req, res) => {
  try {
    let contractAddress = req.body.contractAddress;
    contractAddress = toLowerCase(contractAddress);
    let tokenID = parseInt(req.body.tokenID);
    let token = await NFTITEM.findOne({
      contractAddress: contractAddress,
      tokenID: tokenID
    });
    if (token) {
      token.viewed = token.viewed + 1;
      let _token = await token.save();
      return res.json({
        status: 'success',
        data: _token.viewed
      });
    } else {
      return res.json({
        status: 'success',
        data: 0
      });
    }
  } catch (error) {
    Logger.error(error);
    return res.status(400).json({
      status: 'failed'
    });
  }
});

router.post('/resyncThumbnailPath', async (req, res) => {
  try {
    let contractAddress = req.body.contractAddress;
    contractAddress = toLowerCase(contractAddress);
    let tokenID = parseInt(req.body.tokenID);

    let token = await NFTITEM.findOne({
      contractAddress: contractAddress,
      tokenID: tokenID
    });
    if (token) {
      token.thumbnailPath = '-';
      let _token = await token.save();
      return res.json({
        status: 'success',
        data: _token.thumbnailPath
      });
    } else {
      return res.json({
        status: 'success',
        data: 0
      });
    }
  } catch (error) {
    Logger.error(error);
    return res.status(400).json({
      status: 'failed'
    });
  }
});


const randomIPFS = () => {
  const IPFSUris = [
    'https://openzoo.mypinata.cloud/ipfs/',
    'https://openzoo2.mypinata.cloud/ipfs/',
    'https://openzoo3.mypinata.cloud/ipfs/',

  ];

  let random = Math.floor(Math.random() * IPFSUris.length);

  return `${IPFSUris[random]}`;
};
router.post('/resyncMetajson', async (req, res) => {
  try {
    let contractAddress = req.body.contractAddress;
    contractAddress = toLowerCase(contractAddress);
    let tokenID = parseInt(req.body.tokenID);

    let token = await NFTITEM.findOne({
      contractAddress: contractAddress,
      tokenID: tokenID
    });
    if (token) {
      const SimplifiedERC721ABI = require('../constants/simplifiederc721abi');
      const axios = require('axios');
      let sc = new ethers.Contract(contractAddress, SimplifiedERC721ABI, provider);
      let tokenURI = await sc.tokenURI(tokenID);
      let metadata;
      let metadataURI = tokenURI;
      let contentType = 'image';
      if (tokenURI == token.tokenURI) {
        return res.json({
          status: 'success',
          data: -1
        });
      }
      // now check if token uri is base64
      if (tokenURI.startsWith('data:application/json;base64,')) {
        tokenURI = tokenURI.split(',');
        tokenURI = tokenURI[1];
        let isBased64Encoded = isBase64(tokenURI);
        if (isBased64Encoded) {
          try {
            metadata = Buffer.from(tokenURI, 'base64').toString('utf8');
            metadata = JSON.parse(metadata);
            tokenName = metadata.name;
            imageURL = metadata.image;
          } catch (error) {
            return res.status(400).json({
              status: 'failed'
            });
          }
        }
      } else {

        if (tokenURI.includes('ipfs://')) {
          let uri = tokenURI.split('ipfs://')[1].replace(/([^:]\/)\/+/g, "$1");
          metadataURI = `${randomIPFS()}${uri}`;
        }

        if (
          tokenURI.includes('pinata.cloud') ||
          tokenURI.includes('cloudflare') ||
          tokenURI.includes('ipfs.io') ||
          tokenURI.includes('ipfs.infura.io')
        ) {
          let uri = tokenURI.split('/ipfs/')[1];
          metadataURI = `${randomIPFS()}${uri}`;
        }

        metadata = await axios.get(metadataURI);



        try {
          tokenName = metadata.data.name;
          imageURL = metadata.data.image;

          // Get content Type //
          if (metadata.data.animation_url) {
            let ext = metadata.data.animation_url ? metadata.data.animation_url.split('.').pop() : '';
            switch (ext) {
              case 'mp4': contentType = "video"; break;
              case 'mp3': contentType = "sound"; break;
              case 'glb': contentType = "model"; break;
            }
          }

        } catch (error) {
          return res.status(400).json({
            status: 'failed'
          });
        }
      }

      console.log('New Token URI', tokenURI)
      console.log('New Meta URI', metadataURI)

      // Update new Data //

      token.name = tokenName;
      token.tokenURI = tokenURI;
      token.imageURL = imageURL;

      token.createdAt = Date.now();
      token.contentType = contentType;

      // Clear Thumbnail //
      token.thumbnailPath = '-';
      let _token = await token.save();
      return res.json({
        status: 'success',
        data: _token
      });
    } else {
      return res.json({
        status: 'success',
        data: 0
      });
    }
  } catch (error) {
    Logger.error(error);
    return res.status(400).json({
      status: 'failed'
    });
  }
});

router.post('/setContentType', async (req, res) => {
  try {
    let contractAddress = req.body.contractAddress;
    contractAddress = toLowerCase(contractAddress);
    let tokenID = parseInt(req.body.tokenID);
    let contentType = toLowerCase(req.body.contentType);
    let token = await NFTITEM.findOne({
      contractAddress: contractAddress,
      tokenID: tokenID
    });
    if (token) {
      token.contentType = contentType;
      let _token = await token.save();
      return res.json({
        status: 'success',
        data: _token.contentType
      });
    } else {
      return res.json({
        status: 'success',
        data: 0
      });
    }
  } catch (error) {
    Logger.error(error);
    return res.status(400).json({
      status: 'failed'
    });
  }
});



const sortItems = (_allTokens, sortby) => {
  let tmp = [];
  switch (sortby) {
    case 'createdAt': {
      tmp = orderBy(
        _allTokens,
        ({ createdAt }) => createdAt || new Date(1970, 1, 1),
        ['desc']
      );
      break;
    }
    case 'oldest': {
      tmp = orderBy(
        _allTokens,
        ({ createdAt }) => createdAt || new Date(1970, 1, 1),
        ['asc']
      );
      break;
    }
    case 'price': {
      tmp = orderBy(
        _allTokens,
        ({ currentPriceInUSD }) => currentPriceInUSD || 0,
        ['desc']
      );
      break;
    }
    case 'cheapest': {
      tmp = orderBy(
        _allTokens,
        ({ currentPriceInUSD }) => currentPriceInUSD || MAX_INTEGER,
        ['asc']
      );
      break;
    }
    case 'lastSalePrice': {
      tmp = orderBy(
        _allTokens,
        ({ lastSalePriceInUSD }) => lastSalePriceInUSD || 0,
        ['desc']
      );
      break;
    }
    case 'viewed': {
      tmp = orderBy(_allTokens, ({ viewed }) => viewed || 0, ['desc']);
      break;
    }
    case 'listedAt': {
      tmp = orderBy(
        _allTokens,
        ({ listedAt }) => listedAt || new Date(1970, 1, 1),
        ['desc']
      );
      break;
    }
    /*
    case 'listedAt': {
      tmp = _allTokens.sort((a,b) => b.listedAt - a.listedAt);
      break;
    } */
    case 'soldAt': {
      tmp = orderBy(
        _allTokens,
        ({ soldAt }) => soldAt || new Date(1970, 1, 1),
        ['desc']
      );
      break;
    }
    case 'saleEndsAt': {
      tmp = orderBy(
        _allTokens,
        ({ saleEndsAt }) =>
          saleEndsAt
            ? saleEndsAt - new Date() >= 0
              ? saleEndsAt - new Date()
              : 1623424669
            : 1623424670,
        ['asc']
      );
      break;
    }
  }
  return tmp;
};

const isIncludedInArray = (array, target) => {
  let hash = {};
  for (let i = 0; i < array.length; ++i) {
    hash[array[i]] = i;
  }
  return hash.hasOwnProperty(target);
};

const selectTokens = async (req, res) => {
  // all smart contract categories - 721/1155
  //let tokenTypes = await Category.find({isAppropriate:true});
  //tokenTypes = tokenTypes.map((tt) => [tt.minterAddress, tt.type]);
  try {
    // get options from request & process
    const category = req.body?.category;
    const mediaType = req.body?.mediaType;

    const wallet = req.body?.address && req.body.address.toLowerCase(); // account address from meta mask
    const filterCollections = req.body.collectionAddresses?.length
      ? req.body.collectionAddresses.map((coll) => coll.toLowerCase())
      : null;
    let filters = req.body.filterby; //status -> array or null
    let onlyVerified = false;
    if (filters) {
      onlyVerified = filters.includes('onlyVerified') ? true : false;
      // Remove verified from filter //
      var index = filters.indexOf('onlyVerified');
      if (index !== -1) {
        filters.splice(index, 1);
      }
      if (filters.length === 0) {
        filters = null;
      }

    }

    // create a sort by option
    const selectOption = [
      'contractAddress',
      'contentType',
      'tokenID',
      'tokenURI',
      'tokenType',
      'thumbnailPath',
      'name',
      'imageURL',
      'supply',
      'price',
      'paymentToken',
      'priceInUSD',
      'liked',
      'isAppropriate',
      'saleEndsAt',
      'createdAt',
      'lastSalePricePaymentToken',
      'lastSalePriceInUSD',
      'lastSalePrice',
      'saleEndsAt',
      'listedAt',
      'soldAt',
      'owner',
      'viewed'
    ];

    const getCategoryCollectionAddresses = async (category) => {

      let filterTmp = {}
      if (onlyVerified) {
        filterTmp = {
          categories: category,
          isAppropriate: true,
          isVerified: true
        }
      }
      else {
        filterTmp = {
          categories: category,
          isAppropriate: true,
        }
      }

      const categoryCollectionRows = await Collection.find(filterTmp).select('erc721Address');
      const categoryCollectionAddresses = categoryCollectionRows.map((row) =>
        row.erc721Address.toLowerCase()
      );

      if (filterCollections) {
        return categoryCollectionAddresses.filter((erc721Address) =>
          filterCollections.includes(erc721Address)
        );
      }

      return categoryCollectionAddresses;
    };

    const categoryCollections =
      category === undefined
        ? null
        : await getCategoryCollectionAddresses(category);
    // Filter out disabled explorer collections. Disabled collections are only returned when in filterCollections
    let allExceptDisabledCollections = null;
    if (!categoryCollections && !filterCollections) {
      const disabledExplorerCollectionRows =
        await DisabledExplorerCollection.find();
      const disabledExploreCollectionAddresses =
        disabledExplorerCollectionRows.map((row) =>
          row.minterAddress.toLowerCase()
        );

      let allExploreCollectionRows = null
      if (!onlyVerified) {
        allExploreCollectionRows = await Collection.find({
          erc721Address: { $nin: disabledExploreCollectionAddresses },
        });
      }
      else {
        allExploreCollectionRows = await Collection.find({
          erc721Address: { $nin: disabledExploreCollectionAddresses },
          isVerified: true,
        });
      }

      allExceptDisabledCollections = allExploreCollectionRows.map((row) =>
        row.erc721Address.toLowerCase()
      );
    }
    const collections2filter =
      categoryCollections || filterCollections || allExceptDisabledCollections;

    const lookupNFTItemsAndMerge = [
      {
        $lookup: {
          from: 'nftitems',
          let: {
            id: '$tokenID',
            contract: '$minter'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$tokenID', '$$id']
                    },
                    {
                      $eq: ['$contractAddress', '$$contract']
                    }
                  ]
                }
              }
            }
          ],
          as: 'result'
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              {
                $arrayElemAt: ['$result', 0]
              },
              {
                listing: '$$ROOT._id'
              }
            ]
          }
        }
      }
    ];

    /*
    for global search
     */
    if (!wallet) {
      if (!filters) {
        /*
        when no status option
         */
        /* contract address filter */
        const collectionFilters = {
          ...(collections2filter === null
            ? {}
            : { contractAddress: { $in: [...collections2filter] } }),
          thumbnailPath: { $ne: nonImage },
          isAppropriate: true,
          ...(mediaType ? { contentType: mediaType } : {})
        };
        // let nftListCache = myCache.get(JSON.stringify(collectionFilters));
        // console.log('nftListCache',nftListCache)
        //let ret = NFTITEM.find(collectionFilters).select(selectOption).lean();
        //myCache.set(JSON.stringify(collectionFilters), ret);


        return NFTITEM.find(collectionFilters).select(selectOption).lean();
        // let nftListCache = myCache.get(JSON.stringify(collectionFilters));
        // if (nftListCache === undefined) {
        //   let ret = NFTITEM.find(collectionFilters).select(selectOption).lean();

        //   myCache.set(JSON.stringify(collectionFilters), ret);

        //   return ret;
        // }

        // return nftListCache;
      }

      if (filters) {
        const minterFilters = {
          $match: { $expr: { $in: ['$minter', collections2filter] } }
        };


        if (filters.includes('hasBids')) {
          const activeBidFilter = {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$winningBid', true]
                  },
                  {
                    $eq: ['$auctionActive', true]
                  },
                  collections2filter === null
                    ? undefined
                    : { $in: ['$minter', collections2filter] }
                ].filter((action) => action !== undefined)
              }
            }
          };
          /* for buy now - pick from Bid */
          const pipeline = [activeBidFilter, ...lookupNFTItemsAndMerge].filter(
            (part) => part !== undefined
          );
          if (!mediaType) {
            pipeline.push({ $match: { isAppropriate: true } });
          }
          else {
            pipeline.push({ $match: { isAppropriate: true, contentType: mediaType } });
          }
          return Bid.aggregate(pipeline);
        }
        if (filters.includes('buyNow')) {
          const pipeline = [
            collections2filter === null ? undefined : minterFilters,
            ...lookupNFTItemsAndMerge
          ].filter((part) => part !== undefined);
          if (!mediaType) {
            pipeline.push({ $match: { isAppropriate: true } });
          }
          else {
            pipeline.push({ $match: { isAppropriate: true, contentType: mediaType } });
          }
          return Listing.aggregate(pipeline);
        }
        if (filters.includes('hasOffers')) {
          const activeOfferFilter = {
            $match: { deadline: { $gte: new Date().getTime() } }
          };
          const pipeline = [
            collections2filter === null ? undefined : minterFilters,
            activeOfferFilter,
            ...lookupNFTItemsAndMerge
          ].filter((part) => part !== undefined);


          if (!mediaType) {
            pipeline.push({ $match: { isAppropriate: true } });
          }
          else {
            pipeline.push({ $match: { isAppropriate: true, contentType: mediaType } });
          }
          return Offer.aggregate(pipeline);
        }
        if (filters.includes('onAuction')) {
          const pipeline = [
            collections2filter === null ? undefined : minterFilters,
            ...lookupNFTItemsAndMerge
          ].filter((part) => part !== undefined);
          if (!mediaType) {
            pipeline.push({ $match: { isAppropriate: true, saleEndsAt: { $gte: new Date() } } });
          }
          else {
            pipeline.push({ $match: { isAppropriate: true, contentType: mediaType, saleEndsAt: { $gte: new Date() } } });
          }
          return Auction.aggregate(pipeline);
        }
      }
    }

    if (wallet) {
      /*
    for account search
     */

      // TODO enable erc1155
      const holdingSupplies = new Map();
      const holdings = await ERC1155HOLDING.find({
        holderAddress: wallet,
        supplyPerHolder: { $gt: 0 }
      });
      const holders = holdings.map((holder) => {
        holdingSupplies.set(
          holder.contractAddress + holder.tokenID,
          holder.supplyPerHolder
        );
        return [holder.contractAddress, holder.tokenID];
      });

      if (!filters) {
        /*
        when no status option
         */
        /* contract address filter */
        const collectionFilters721 = {
          ...(collections2filter === null
            ? {}
            : { contractAddress: { $in: [...collections2filter] } }),
          ...(wallet ? { owner: wallet } : {}),
          //thumbnailPath: { $ne: nonImage },
          isAppropriate: true
        };

        const tokens_721 = await NFTITEM.find(collectionFilters721).select(selectOption).lean();


        //return tokens_721;
        // TODO enable erc1155
        let collectionFilters1155 = {
          ...(collections2filter != null
            ? { contractAddress: { $in: [...collections2filter] } }
            : {}),
          //thumbnailPath: { $ne: nonImage },
          isAppropriate: true
        };
        let _tokens_1155 = await NFTITEM.find(collectionFilters1155)
          .select(selectOption)
          .lean();
        let tokens_1155 = [];
        _tokens_1155.map((token_1155) => {
          let isIncluded = isIncludedInArray(holders, [
            token_1155.contractAddress,
            token_1155.tokenID
          ]);
          if (isIncluded)
            tokens_1155.push({
              supply: token_1155.supply,
              price: token_1155.price,
              paymentToken: token_1155.paymentToken,
              priceInUSD: token_1155.priceInUSD,
              lastSalePrice: token_1155.lastSalePrice,
              lastSalePricePaymentToken: token_1155.lastSalePricePaymentToken,
              lastSalePriceInUSD: token_1155.lastSalePriceInUSD,
              viewed: token_1155.viewed,
              contractAddress: token_1155.contractAddress,
              tokenID: token_1155.tokenID,
              tokenURI: token_1155.tokenURI,
              thumbnailPath: token_1155.thumbnailPath,
              imageURL: token_1155.imageURL,
              tokenType: token_1155.tokenType,
              name: token_1155.name,
              symbol: token_1155.symbol,
              liked: token_1155.liked,
              createdAt: token_1155.createdAt,
              saleEndsAt: token_1155.saleEndsAt,
              isAppropriate: token_1155.isAppropriate,
              contentType: token_1155.contentType,
              holderSupply: holdingSupplies.get(
                token_1155.contractAddress + token_1155.tokenID
              )
            });
        });

        let allTokens = [...tokens_721, ...tokens_1155];

        return allTokens
      }
      if (filters) {
        /*
        when status option
         */

        const accountAndMintFilter = (accountColumnName) => ({
          $match: {
            $expr: {
              $and: [
                {
                  $eq: [`$${accountColumnName}`, wallet]
                },
                collections2filter === null
                  ? undefined
                  : { $in: ['$minter', collections2filter] }
              ].filter((action) => action !== undefined)
            }
          }
        });
        if (filters.includes('hasBids')) {
          /* for has bids - pick from Bid */
          const activeBidAccountFilter = {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$winningBid', true]
                  },
                  {
                    $eq: ['$auctionActive', true]
                  },
                  collections2filter === null
                    ? undefined
                    : { $in: ['$minter', collections2filter] },

                ].filter((action) => action !== undefined)
              }
            }
          };

          const pipeline = [activeBidAccountFilter, ...lookupNFTItemsAndMerge].filter(
            (part) => part !== undefined
          );

          pipeline.push({ $match: { owner: wallet } });

          return Bid.aggregate(pipeline);
        }

        if (filters.includes('buyNow')) {
          const pipeline = [
            accountAndMintFilter('owner'),
            ...lookupNFTItemsAndMerge
          ];
          return Listing.aggregate(pipeline);
        }
        if (filters.includes('hasOffers')) {
          const activeOfferFilter = {
            $match: { deadline: { $gte: new Date().getTime() } }
          };
          const pipeline = [activeOfferFilter, ...lookupNFTItemsAndMerge].filter(
            (part) => part !== undefined
          );
          pipeline.push({ $match: { owner: wallet } });
          return Offer.aggregate(pipeline);
        }
        if (filters.includes('onAuction')) {
          const pipeline = [...lookupNFTItemsAndMerge].filter(
            (part) => part !== undefined
          );
          pipeline.push({ $match: { owner: wallet } });
          return Auction.aggregate(pipeline);
        }
      }
    }
  } catch (error) {
    Logger.error(error);
    return null;
  }
};

const getBundleItemDetails = async (bundleItem) => {
  try {
    let nftItem = await NFTITEM.findOne({
      contractAddress: bundleItem.contractAddress,
      tokenID: bundleItem.tokenID
    });
    if (nftItem)
      return {
        imageURL: nftItem.imageURL,
        thumbnailPath: nftItem.thumbnailPath
      };
    else return {};
  } catch (error) {
    Logger.error(error);
    return {};
  }
};

const entailBundleInfoItems = async (bundleInfoItems) => {
  let details = [];
  let promise = bundleInfoItems.map(async (bundleInfoItem) => {
    let detail = await getBundleItemDetails(bundleInfoItem);
    details.push({
      ...bundleInfoItem._doc,
      ...detail
    });
  });
  await Promise.all(promise);
  return details;
};
const selectBundles = async (req, res) => {
  try {
    let collections2filter = null;
    let selectedCollections = req.body.collectionAddresses;
    let filters = req.body.filterby;
    let wallet = req.body.address;
    if (wallet) wallet = toLowerCase(wallet);
    if (!selectedCollections) selectedCollections = [];
    else {
      selectedCollections = selectedCollections.map((selectedCollection) =>
        toLowerCase(selectedCollection)
      );
      collections2filter = selectedCollections;
    }
    let category = req.body.category; //category -> array or null

    let categoryCollections = null;

    if (category != undefined) {
      categoryCollections = await Collection.find({
        categories: category
      }).select('erc721Address');
      categoryCollections = categoryCollections.map((c) =>
        toLowerCase(c.erc721Address)
      );
      if (collections2filter != null) {
        collections2filter = collections2filter.filter((x) =>
          categoryCollections.includes(x)
        );
        if (collections2filter.length == 0) {
          // if not intersection between categoryfilter & collection filter => return null
          collections2filter = null;
          return [];
        }
      } else {
        collections2filter = categoryCollections;
      }
    }

    // if (!wallet) {
    if (filters == null) {
      /*
        when no status option
         */
      /* contract address filter */
      let collectionFilters = {
        ...(collections2filter != null
          ? { contractAddress: { $in: [...collections2filter] } }
          : {})
      };

      let bundleInfos = await BundleInfo.find(collectionFilters);
      bundleInfos = await entailBundleInfoItems(bundleInfos);

      let bundleIDs = [];
      bundleInfos.map((bundleInfo) => {
        if (!bundleIDs.includes(bundleInfo.bundleID)) {
          bundleIDs.push(bundleInfo.bundleID);
        }
      });

      let bundleFilter = {
        ...(wallet != null ? { owner: { $regex: wallet, $options: 'i' } } : {}),
        ...{ _id: { $in: bundleIDs } }
      };

      let bundles = await Bundle.find(bundleFilter);

      let data = [];
      bundles.map((bundle) => {
        let bundleItems = bundleInfos.filter(
          (bundleInfo) =>
            bundleInfo.bundleID.toString() == bundle._id.toString()
        );
        data.push({
          viewed: bundle._doc.viewed,
          liked: bundle._doc.liked,
          price: bundle._doc.price,
          paymentToken: bundle._doc.paymentToken,
          priceInUSD: bundle._doc.priceInUSD,
          _id: bundle._doc._id,
          name: bundle._doc.name,
          lastSalePrice: bundle._doc.lastSalePrice,
          lastSalePricePaymentToken: bundle._doc.lastSalePricePaymentToken,
          lastSalePriceInUSD: bundle._doc.lastSalePriceInUSD,
          listedAt: bundle._doc.listedAt,
          soldAt: bundle._doc.soldAt,
          createdAt: bundle._doc.createdAt,
          items: bundleItems
        });
      });
      return data;
    } else if (filters.includes('buyNow') || filters.includes('onAuction')) {
      /*
        when no status option
         */
      /* contract address filter */
      let collectionFilters = {
        ...(collections2filter != null
          ? { contractAddress: { $in: [...collections2filter] } }
          : {})
      };

      let data = [];
      let filterBundleIDs = [];
      if (filters.includes('buyNow')) {
        let listedBundles = await BundleListing.find().select(['bundleID']);
        let listedBundleIDs = listedBundles.map(
          (listedBundle) => listedBundle.bundleID
        );
        filterBundleIDs = [...filterBundleIDs, ...listedBundleIDs];
      }
      if (filters.includes('hasOffers')) {
        let offerBundles = await BundleOffer.find().select(['bundleID']);
        let offerBundleIDs = offerBundles.map(
          (offerBundle) => offerBundle.bundleID
        );
        filterBundleIDs = [...filterBundleIDs, ...offerBundleIDs];
      }
      let bundleInfos = await BundleInfo.find(collectionFilters);
      bundleInfos = await entailBundleInfoItems(bundleInfos);
      let bundleIDs = [];
      bundleInfos.map((bundleInfo) => {
        if (!bundleIDs.includes(bundleInfo.bundleID)) {
          if (filterBundleIDs.includes(bundleInfo.bundleID))
            bundleIDs.push(bundleInfo.bundleID);
        }
      });
      let bundleFilter = {
        ...(wallet != null ? { owner: { $regex: wallet, $options: 'i' } } : {}),
        ...{ _id: { $in: bundleIDs } }
      };
      let bundles = await Bundle.find(bundleFilter);
      bundles.map((bundle) => {
        let bundleItems = bundleInfos.filter(
          (bundleInfo) => bundleInfo.bundleID == bundle._id
        );
        data.push({
          viewed: bundle._doc.viewed,
          liked: bundle._doc.liked,
          price: bundle._doc.price,
          paymentToken: bundle._doc.paymentToken,
          priceInUSD: bundle._doc.priceInUSD,
          _id: bundle._doc._id,
          name: bundle._doc.name,
          lastSalePrice: bundle._doc.lastSalePrice,
          lastSalePricePaymentToken: bundle._doc.lastSalePricePaymentToken,
          lastSalePriceInUSD: bundle._doc.lastSalePriceInUSD,
          listedAt: bundle._doc.listedAt,
          soldAt: bundle._doc.soldAt,
          createdAt: bundle._doc.createdAt,
          items: bundleItems
        });
      });
      return data;
    } else {
      /*
        when no status option
         */
      /* contract address filter */
      let collectionFilters = {
        ...(collections2filter != null
          ? { contractAddress: { $in: [...collections2filter] } }
          : {})
      };
      let bundleInfos = await BundleInfo.find(collectionFilters);
      bundleInfos = await entailBundleInfoItems(bundleInfos);
      let bundleIDs = [];
      bundleInfos.map((bundleInfo) => {
        if (!bundleIDs.includes(bundleInfo.bundleID)) {
          bundleIDs.push(bundleInfo.bundleID);
        }
      });
      let bundleFilter = {
        ...(wallet != null ? { owner: { $regex: wallet, $options: 'i' } } : {}),
        ...{ _id: { $in: bundleIDs } }
      };
      let bundles = await Bundle.find(bundleFilter);
      let data = [];
      bundles.map((bundle) => {
        let bundleItems = bundleInfos.filter(
          (bundleInfo) => bundleInfo.bundleID == bundle._id
        );
        bundleItems = bundleItems.map((bi) => ({
          bundleID: bi.bundleID,
          contractAddress: bi.contractAddress,
          imageURL: bi.imageURL,
          supply: bi.supply,
          thumbnailPath: bi.thumbnailPath,
          tokenID: bi.tokenID,
          tokenType: bi.tokenType,
          tokenURI: bi.tokenURI
        }));
        data.push({
          viewed: bundle._doc.viewed,
          liked: bundle._doc.liked,
          price: bundle._doc.price,
          paymentToken: bundle._doc.paymentToken,
          priceInUSD: bundle._doc.priceInUSD,
          _id: bundle._doc._id,
          name: bundle._doc.name,
          lastSalePrice: bundle._doc.lastSalePrice,
          lastSalePricePaymentToken: bundle._doc.lastSalePricePaymentToken,
          lastSalePriceInUSD: bundle._doc.lastSalePriceInUSD,
          listedAt: bundle._doc.listedAt,
          soldAt: bundle._doc.soldAt,
          createdAt: bundle._doc.createdAt,
          items: bundleItems
        });
      });
      return data;
    }
  } catch (error) {
    Logger.error(error);
    return null;
  }
};




router.post('/syncAttribute', async (req, res) => {
  try {
    console.log(req.body);
    let address = toLowerCase(req.body.address); //contract address
    let tokenID = parseInt(req.body.tokenID); //tokenID

    let erc721token = await NFTITEM.findOne({
      contractAddress: address,
      tokenID: tokenID,

    });

    return res.json(erc721token);
  } catch (error) {
    Logger.error(error);
    return res.json({});
  }

});

router.post('/fetchTokens', async (req, res) => {
  let timestart = Date.now();

  let type = req.body.type; // type - item type
  let sortby = req.body.sortby; //sort -> string param
  let from = parseInt(req.body.from);
  let count = parseInt(req.body.count);
  let isProfile = req.body.isProfile;
  let attributes = req.body.attributes;



  console.log('[fetchTokens]', req.body);
  let request_ip = requestIP.getClientIp(req);
  console.log('request_ip', request_ip);
  /*if (count > 80 || count === 0)
  {
    return res.json({
      status: 'failed',
      data: {
        tokens: [],
        total: 0
      }
    });
  }*/

  console.log('cost 1', Date.now() - timestart);

  let items = myCache.get('explore_cache');

  if (isProfile === true || req.body.collectionAddress.length > 0) {
    items = undefined;
  }
  else
  {
    console.log('Explore Page to Cache')
  }

  //key//
  if (items === undefined) {
    if (type === 'all') {
      let nfts = await selectTokens(req, res);
      //let bundles = await selectBundles(req, res);
      //items = [...nfts, ...bundles]; // Todo for Bundle pack
      items = [...nfts];
    } else if (type === 'single') {
      items = await selectTokens(req, res);
    } else if (type === 'bundle') {
      items = await selectBundles(req, res);
    }

    if (isProfile !== true && req.body.collectionAddress.length === 0) {
      myCache.set('explore_cache', items, 15);
      console.log('Explore Page cached')
    }
    
  }

  console.log('cost 2 selectTokens', Date.now() - timestart);

  // Prune dup //
  const filters = req.body.filterby;
  if (isProfile || (filters && filters.length > 0))
    items = items.filter(
      (tk, idx) =>
        items.findIndex(_tk =>
          tk.items
            ? tk._id === _tk._id
            : tk.contractAddress === _tk.contractAddress &&
            tk.tokenID === _tk.tokenID
        ) === idx
    );

  console.log('cost 3 prune', Date.now() - timestart);

  let updatedItems = [];
  let data = [];
  let _searchResults = [];
  if (sortby === 'price' || sortby === 'cheapest') {
    updatedItems = updatePrices(items);
    data = sortItems(updatedItems, sortby);
    data = await applyAttributeFilter(attributes, req.body.collectionAddresses?.[0], data);
    _searchResults = data.slice(from, from + count);
  }
  else {
    data = sortItems(items, sortby);
    data = await applyAttributeFilter(attributes, req.body.collectionAddresses?.[0], data);
    _searchResults = data.slice(from, from + count);
    _searchResults = updatePrices(_searchResults);

  }

  console.log('cost 4 sort', Date.now() - timestart);


  let searchResults = _searchResults.map(async (sr) => ({
    ...(sr.contractAddress != null && sr.contractAddress != undefined
      ? { contractAddress: sr.contractAddress }
      : {}),
    ...(sr.contentType != null && sr.contentType != undefined
      ? { contentType: sr.contentType }
      : {}),
    ...(sr.imageURL != null && sr.imageURL != undefined
      ? { imageURL: sr.imageURL }
      : {}),
    ...(sr.name != null && sr.name != undefined ? { name: sr.name } : {}),
    ...(sr.price != null && sr.price != undefined ? { price: sr.price } : {}),
    ...(sr.paymentToken != null && sr.paymentToken != undefined
      ? { paymentToken: sr.paymentToken }
      : {}),
    ...(sr.priceInUSD != null && sr.priceInUSD != undefined
      ? { priceInUSD: sr.priceInUSD }
      : {}),
    ...(sr.supply != null && sr.supply != undefined
      ? { supply: sr.supply }
      : {}),
    ...(sr.thumbnailPath != null && sr.thumbnailPath != undefined
      ? { thumbnailPath: sr.thumbnailPath }
      : {}),
    ...(sr.tokenID != null && sr.tokenID != undefined
      ? { tokenID: sr.tokenID }
      : {}),
    ...(sr.tokenType != null && sr.tokenType != undefined
      ? { tokenType: sr.tokenType }
      : {}),
    ...(sr.tokenURI != null && sr.tokenURI != undefined
      ? { tokenURI: sr.tokenURI }
      : {}),
    ...(sr.items != null && sr.items != undefined ? { items: sr.items } : {}),
    ...(sr.liked != null && sr.liked != undefined ? { liked: sr.liked } : {}),
    ...(sr._id != null && sr._id != undefined ? { _id: sr._id } : {}),
    ...(sr.holderSupply != null && sr.holderSupply != undefined
      ? { holderSupply: sr.holderSupply }
      : {}),
    ...(sr.saleEndsAt != null && sr.saleEndsAt != undefined
      ? { saleEndsAt: sr.saleEndsAt }
      : {}),
    ...(sr.lastSalePrice != null && sr.lastSalePrice != undefined
      ? { lastSalePrice: sr.lastSalePrice }
      : {}),
    ...(sr.lastSalePricePaymentToken != null &&
      sr.lastSalePricePaymentToken != undefined
      ? { lastSalePricePaymentToken: sr.lastSalePricePaymentToken }
      : {}),
    ...(sr.lastSalePriceInUSD != null && sr.lastSalePriceInUSD != undefined
      ? { lastSalePriceInUSD: sr.lastSalePriceInUSD }
      : {}),
    ...(sr.owner != null && sr.owner != undefined
      ? { owner: sr.owner }
      : {}),
    ...(sr.isAppropriate != null && sr.isAppropriate != undefined
      ? { isAppropriate: sr.isAppropriate }
      : { isAppropriate: false }),
    ownerAlias: await getAccountInfo(sr.owner),
    isAuction: await getIsAuction(sr.contractAddress, sr.tokenID),
    listedAt: sr.listedAt,
    soldAt: sr.soldAt
  }));
  const results = await Promise.all(searchResults);

  console.log('cost 5 search', Date.now() - timestart);

  return res.json({
    status: 'success',
    data: {
      tokens: results,
      total: data.length
    }
  });
});

const parseAddress = (data) => {
  let length = data.length;
  return data.substring(0, 2) + data.substring(length - 40);
};

router.post('/transfer721History', async (req, res) => {
  try {
    let tokenID = parseInt(req.body.tokenID);
    let address = toLowerCase(req.body.address);
    let history = await fetchTransferHistory721(address, tokenID);


    if (history) {
      history = history.sort((a, b) => {
        var dateA = new Date(a.createdAt).getTime();
        var dateB = new Date(b.createdAt).getTime();
        return dateA < dateB ? 1 : -1; // ? -1 : 1 for ascending/increasing order
      });
    }

    // Update Owner //
    if (history[0]) {
      let nft = await NFTITEM.findOne({
        contractAddress: address,
        tokenID: tokenID,
        isAppropriate: true
      });
      if (nft) {
        nft.owner = history[0].to;
        console.log('update latest owner', history[0].to);
        await nft.save();
      }
    }

    return res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    Logger.error(error);
    return res.json({
      status: 'failed'
    });
  }
});

router.post('/transfer1155History', async (req, res) => {
  try {
    let tokenID = parseInt(req.body.tokenID);
    let address = toLowerCase(req.body.address);
    let history = await fetchTransferHistory1155(address, tokenID);
    return res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    Logger.error(error);
    return res.json({
      status: 'failed'
    });
  }
});

router.post('/getSingleItemDetails', async (req, res) => {
  try {
    let contractAddress = toLowerCase(req.body.contractAddress);
    let tokenID = parseInt(req.body.tokenID);
    let category = await Category.findOne({ minterAddress: contractAddress });
    // token type
    let tokenType = category ? category.type : 721;
    let nft = await NFTITEM.findOne({
      contractAddress: contractAddress,
      tokenID: tokenID,
      isAppropriate: true
    });
    if (!nft) {
      return res.json({
        status: 'failed'
      });
    }
    // content type
    let contentType = nft.contentType;
    // Thumbnail
    let thumbnailPath = nft.thumbnailPath;
    // likes count
    let likes = nft ? nft.liked : 0;
    // token uri
    let uri = nft ? nft.tokenURI : '';

    let owner = nft ? nft.owner : '';
    // get listings
    let listings = [];
    let _listings = await Listing.find({
      minter: contractAddress,
      tokenID: tokenID
    });
    let listingPromise = _listings.map(async (list) => {
      let account = await getAccountInfo(list.owner);
      listings.push({
        quantity: list.quantity,
        startTime: list.startTime,
        owner: list.owner,
        minter: list.minter,
        tokenID: list.tokenID,
        price: list.price,
        priceInUSD: list.priceInUSD,
        paymentToken: list.paymentToken,
        alias: account ? account[0] : null,
        image: account ? account[1] : null
      });
    });
    await Promise.all(listingPromise);
    listings = orderBy(listings, 'price', 'asc');

    // get offers
    let offers = [];

    let _offers = await Offer.find({
      minter: { $regex: new RegExp(contractAddress, 'i') },
      tokenID: tokenID
    });
    let offerPromise = _offers.map(async (offer) => {
      let account = await getAccountInfo(offer.creator);
      offers.push({
        creator: offer.creator,
        minter: offer.minter,
        tokenID: offer.tokenID,
        quantity: offer.quantity,
        pricePerItem: offer.pricePerItem,
        paymentToken: offer.paymentToken,
        priceInUSD: offer.priceInUSD,
        deadline: offer.deadline,
        alias: account ? account[0] : null,
        image: account ? account[1] : null
      });
    });
    await Promise.all(offerPromise);
    // get trade history
    let _history = await TradeHistory.find({
      collectionAddress: { $regex: new RegExp(contractAddress, 'i') },
      tokenID: tokenID
    })
      .select([
        'from',
        'to',
        'tokenID',
        'price',
        'paymentToken',
        'priceInUSD',
        'value',
        'txHash',
        'createdAt',
        'isAuction'
      ])
      .sort({ createdAt: 'desc' });
    let history = [];

    let historyPromise = _history.map(async (hist) => {
      let sender = await getAccountInfo(hist.from);
      let receiver = await getAccountInfo(hist.to);
      let finalPrice = 0;
      if (hist.isAuction === true) {
        finalPrice = hist.price * hist.priceInUSD;
      }
      else {
        finalPrice = hist.priceInUSD;
      }
      history.push({
        from: hist.from,
        to: hist.to,
        tokenID: hist.tokenID,
        price: hist.price,
        paymentToken: hist.paymentToken,
        priceInUSD: finalPrice,
        value: hist.value,
        createdAt: hist.createdAt,
        isAuction: hist.isAuction,
        txHash: hist.txHash,
        fromAlias: sender ? sender[0] : null,
        fromImage: sender ? sender[1] : null,
        toAlias: receiver ? receiver[0] : null,
        toImage: receiver ? receiver[1] : null
      });
    });
    await Promise.all(historyPromise);
    // more from this collection
    let nfts = await NFTITEM.find({
      contractAddress: contractAddress,
      tokenID: { $ne: tokenID },
      isAppropriate: true
    })
      .sort({ viewed: 'desc' })
      .limit(10)
      .select([
        'thumbnailPath',
        'supply',
        'price',
        'paymentToken',
        'priceInUSD',
        'tokenType',
        'tokenID',
        'tokenURI',
        'name',
        'imageURL',
        'liked',
        'contractAddress',
        'isAppropriate',
        'lastSalePrice',
        'lastSalePricePaymentToken',
        'lastSalePriceInUSD',
        'saleEndsAt',
        'contentType',
        'listedAt',
      ]);
    let hasUnlockable = await UnlockableContents.findOne({
      contractAddress: contractAddress,
      tokenID: tokenID
    });
    hasUnlockable = hasUnlockable ? true : false;
    return res.json({
      status: 'success',
      data: {
        tokenType,
        thumbnailPath,
        likes,
        uri,
        listings,
        offers,
        history,
        nfts,
        contentType,
        hasUnlockable,
        owner
      }
    });
  } catch (error) {
    Logger.error(error);
    return res.json({
      status: 'failed'
    });
  }
});

const getBlockTime = async (blockNumber) => {
  let block = await provider.getBlock(blockNumber);
  let blockTime = block.timestamp;
  blockTime = new Date(blockTime * 1000);
  return blockTime;
};

const parseBatchTransferData = (data) => {
  let tokenIDs = [];
  data = data.substring(2);
  let segments = data.length / 64;
  let tkCount = segments / 2;
  let tkData = data.substring(64 * 3, 64 * (tkCount + 1));
  for (let i = 0; i < tkData.length / 64; ++i) {
    let _tkData = tkData.substring(i * 64, (i + 1) * 64);
    let tokenID = parseInt(_tkData.toString(), 16);
    tokenIDs.push(tokenID);
  }
  return tokenIDs;
};

const fetchTransferHistory721 = async (address, tokenID) => {
  let evts = await provider.getLogs({
    address: address,
    fromBlock: 0,
    topics: [
      ethers.utils.id('Transfer(address,address,uint256)'),
      null,
      null,
      ethers.utils.hexZeroPad(tokenID, 32)
    ]
  });

  let history = [];
  let promise = evts.map(async (evt) => {
    let from = parseAddress(evt.topics[1]);
    let to = parseAddress(evt.topics[2]);
    let blockNumber = evt.blockNumber;
    let blockTime = await getBlockTime(blockNumber);
    let sender = await getAccountInfo(from);
    let receiver = await getAccountInfo(to);
    history.push({
      from,
      to,
      createdAt: blockTime,
      fromAlias: sender ? sender[0] : null,
      fromImage: sender ? sender[1] : null,
      toAlias: receiver ? receiver[0] : null,
      toImage: receiver ? receiver[1] : null
    });
  });
  await Promise.all(promise);
  return history;
};
const parseSingleTrasferData = (data) => {
  return [
    parseInt(data.substring(0, 66), 16),
    parseInt(data.substring(66), 16)
  ];
};

const fetchTransferHistory1155 = async (address, id) => {

  let singleTransferEvts = await provider.getLogs({
    address: address,
    fromBlock: 0,
    topics: [
      ethers.utils.id(
        'TransferSingle(address,address,address,uint256,uint256)'
      ),
      null,
      null,
      null,
      null,
      null
    ]
  });
  let batchTransferEvts = await provider.getLogs({
    address: address,
    fromBlock: 0,
    topics: [
      ethers.utils.id(
        'TransferBatch(address,address,address,uint256[],uint256[])'
      ),
      null,
      null,
      null,
      null,
      null
    ]
  });

  let history = [];

  // process single transfer event logs
  let singplePromise = singleTransferEvts.map(async (evt) => {
    let data = evt.data;
    data = parseSingleTrasferData(data);
    let tokenID = data[0];
    if (parseInt(tokenID) == parseInt(id)) {
      let topics = evt.topics;
      let blockNumber = evt.blockNumber;
      let blockTime = await getBlockTime(blockNumber);
      let tokenTransferValue = data[1];
      let from = toLowerCase(parseAddress(topics[2]));
      let to = toLowerCase(parseAddress(topics[3]));
      let sender = await getAccountInfo(from);
      let receiver = await getAccountInfo(to);
      history.push({
        from,
        to,
        createdAt: blockTime,
        tokenID,
        value: tokenTransferValue,
        fromAlias: sender ? sender[0] : null,
        fromImage: sender ? sender[1] : null,
        toAlias: receiver ? receiver[0] : null,
        toImage: receiver ? receiver[1] : null
      });
    }
  });
  await Promise.all(singplePromise);

  let batchPromise = batchTransferEvts.map(async (evt) => {
    let data = evt.data;
    let topics = evt.topics;
    let tokenIDs = parseBatchTransferData(data);
    if (tokenIDs.includes(id)) {
      let from = toLowerCase(parseAddress(topics[2]));
      let to = toLowerCase(parseAddress(topics[3]));
      let sender = await getAccountInfo(from);
      let receiver = await getAccountInfo(to);
      let blockNumber = evt.blockNumber;
      let blockTime = null;
      let _batchPromise = tokenIDs.map(async (tokenID) => {
        if (parseInt(tokenID) == parseInt(id)) {
          if (blockTime == null) blockTime = await getBlockTime(blockNumber);
          history.push({
            from,
            to,
            createdAt: blockTime,
            tokenID,
            fromAlias: sender ? sender[0] : null,
            fromImage: sender ? sender[1] : null,
            toAlias: receiver ? receiver[0] : null,
            toImage: receiver ? receiver[1] : null
          });
        }
      });
      await Promise.all(_batchPromise);
    }
  });
  await Promise.all(batchPromise);
  // process batch transfer event logs
  let _history = orderBy(history, 'blockTime', 'asc');
  return _history;
};

const getIsAuction = async (address, tokenID) => {
  try {
    let auctionCount = await Auction.countDocuments({ minter: address, tokenID: tokenID });
    if (auctionCount > 0) return true;
    return false;
  } catch (error) {
    return false;
  }
}

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

const applyAttributeFilter = async (attributes, collectionAddress, data) => {

  if (!attributes || !Object.keys(attributes).length || !collectionAddress || !data || !data.length)
    return data;

  const attributeMatchFilter =
    Object.keys(attributes)
      .reduce((acc, key) => {
        acc[`attributes.${key}`] = attributes[key].isNumeric ?
          { $exists: true, $gte: attributes[key].value[0], $lte: attributes[key].value[1] } :
          { $exists: true, $in: attributes[key].value.map(x => x.value) };
        return acc;
      }, {});

  const pipeline = [
    { $match: { contractAddress: collectionAddress, _nftItemId: { $in: data.map(x => x._id) } } },
    {
      $project: {
        _id: 0,
        _nftItemId: 1,
        attributes: {
          $arrayToObject: {
            $map: {
              input: '$attributes',
              as: 'el',
              in: {
                k: '$$el.trait_type',
                v: '$$el.value'
              }
            }
          }
        }
      }
    },
    { $match: { ...attributeMatchFilter } },
    {
      $project: {
        _nftItemId: 1
      }
    }
  ];

  let results = (await NFTAttribute.aggregate(pipeline)).map(x => x._nftItemId.toString());
  return data.filter(x => results.includes(x._id.toString()));
}

module.exports = router;
