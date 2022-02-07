const mongoose = require("mongoose");

const NFTAttribute = mongoose.Schema({
  _nftItemId: { type: mongoose.Schema.Types.ObjectId, ref: "nftitems" },
  contractAddress: { type: String, required: true },
  tokenURI: { type: String, required: true },
  tokenID: { type: Number, required: true },
  attributes: { type: [], required: true },
  ipfsRecord: { type: mongoose.Schema.Types.Mixed, required: true },
  errorCode: { type: mongoose.Schema.Types.Number, default: 0 },
  errorMessage: { type: mongoose.Schema.Types.String },
  isRemoteHasAttributes: { type: mongoose.Schema.Types.Boolean, default: true },
  updatedAt: { type: mongoose.Schema.Types.Date },
});

NFTAttribute.index({ _nftItemId: 1, contractAddress: 1 }, { unique: true });

module.exports = mongoose.model("NFTAttribute", NFTAttribute);
