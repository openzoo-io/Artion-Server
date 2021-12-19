require("dotenv").config();
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const foundationEmail = "contact@openzoo.io";

const adminEmails = ["fennec@zookeeper.finance"];

const createDenyMessage = (data) => {
  return {
    to: data.to,
    from: foundationEmail,
    subject: data.subject,
    text: "OpenZoo notification",
    html: `Your collection has been denied to register on OpenZoo. <br/><br/> reason : ${data.reason} </br></br> Thank You.  <br/><br/>`,
  };
};

const createApproveMessage = (data) => {
  return {
    to: data.to,
    from: foundationEmail,
    subject: data.subject,
    text: "OpenZoo notification",
    html: "Dear OpenZoo User! <br/> Your collection has been successfully registered in OpenZoo. ",
  };
};

const sendApplicationDenyEmail = (data) => {
  let message = createDenyMessage(data);
  sgMail.sendMultiple(message).then(
    () => {},
    (error) => {
      if (error.response) {
      }
    }
  );
};

const sendApplicationReviewedEmail = (data) => {
  let message = createApproveMessage(data);
  sgMail.sendMultiple(message).then(
    () => {},
    (error) => {
      if (error.response) {
      }
    }
  );
};

const notifyAdminForNewCollectionApplication = () => {
  let message = {
    to: adminEmails,
    from: foundationEmail,
    subject: "New Application",
    text: "OpenZoo notification",
    html: "New collection has been submitted for your review.",
  };
  sgMail.sendMultiple(message).then(
    () => {},
    (error) => {
      if (error.response) {
      }
    }
  );
};

const notifyInternalCollectionDeployment = (address, email) => {
  let message = {
    to: email,
    from: foundationEmail,
    subject: "Collection Created",
    text: "OpenZoo notification",
    html: `New collection has been deployed with address ${address}`,
  };
  sgMail.send(message).then(
    () => {},
    (error) => {
      if (error.response) {
        console.error(error.response.body);
      }
    }
  );
};

const applicationMailer = {
  sendApplicationDenyEmail,
  sendApplicationReviewedEmail,
  notifyAdminForNewCollectionApplication,
  notifyInternalCollectionDeployment,
};

module.exports = applicationMailer;
