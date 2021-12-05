const router = require("express").Router();
const sgMail = require("@sendgrid/mail");
const Logger = require("../services/logger");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const SendGridTemplates = require("../constants/mail_template_id");
router.get("/mailTest", async (req, res) => {
  try {
    let msg = {
      from: "noreply@openzoo.io",
      templateId: SendGridTemplates.nftitem,
      personalizations: [
        {
          to: [
            "fennec@zookeeper.finance"
           
          ],
          dynamic_template_data: {
            title: "OpenZoo Mail Testing",
            content:
              "I am testing email template please let me know if you like this.",
            image: "https://storage.artion.io/image/1629994367734.png",
            name: "From Ethereum to Wanchain",
            link: "https://artion.io/explore/0x7f6a67065fa3d2e42383a27f1a7537c2ab88318b/4",
          },
          // dynamic_template_data: {
          //   title: "Jason Test",
          //   content:
          //     "I am testing email template please let me know if you like this.",
          //   // image: "https://storage.artion.io/image/1629994367734.png",
          //   // name: "From Ethereum to Fantom",
          //   link: "https://artion.io/explore/0x7f6a67065fa3d2e42383a27f1a7537c2ab88318b/4",
          // },
        },
      ],
    };
    //send the email
    sgMail.send(msg, (error, result) => {
      if (error) {
        Logger.error(error);
        return res.json({ status: "failed" });
      } else {
        Logger.info("Mail was send successful!")
        return res.json({ status: "success" });
      }
    });
  } catch (error) {
    Logger.error(error);
    return res.json({ status: "failed" });
  }
});

module.exports = router;
