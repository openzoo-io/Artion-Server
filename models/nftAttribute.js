const mongoose = require("mongoose");

const NFTAttribute = mongoose.Schema({
  _nftItemId: { type: mongoose.Schema.Types.ObjectId, ref: "nftitems" },
  contractAddress: { type: String, required: true },
  tokenURI: { type: String, required: true },
  tokenID: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  attributes: { type: [], required: true },
});

NFTAttribute.index({ _nftItemId: 1, contractAddress: 1 }, { unique: true });
mongoose.model("NFTAttribute", NFTAttribute);
