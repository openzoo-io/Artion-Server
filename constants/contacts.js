require("dotenv").config();
const FantomContacts = {
  discord: "https://discord.com/invite/zookeeper",
  twitter: "https://twitter.com/ZooFarming",
  telegram: "https://t.me/zoofarming",
  reddit: "https://www.reddit.com/r/ZooFarming/",
  artionUnsubscribe: `https://${
    process.env.RUNTIME ? "testnet." : ""
  }openzoo.io/settings/notification`,
  email: "notification@openzoo.io",
};

module.exports = FantomContacts;
