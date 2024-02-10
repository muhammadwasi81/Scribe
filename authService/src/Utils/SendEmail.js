import fs from "fs";
import nodemailer from "nodemailer";
// import { emailConfig } from "../Config/emailConfig.js";
import aws from "@aws-sdk/client-ses";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { config } from "dotenv";
config();

// AWS SES

const ses = new aws.SES({
  region: process.env.region,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  },

  defaultProvider,
});

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  SES: {
    ses,
    aws: aws,
  },
});

// Converting Stream to Buffer
export const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream.on("data", (data) => buffers.push(data));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(buffers)));
  });
};

// GetFile Content
export const getFileContent = async (filePath) => {
  const fileStream = fs.createReadStream(filePath);
  const buffer = await streamToBuffer(fileStream);
  return buffer.toString();
};

// send mail with defined transport object
export const sendEmails = async (to, subject, content, attachments, next) => {
  try {
    const message = {
      from: {
        name: process.env.MAIL_FROM_NAME,
        address: process.env.MAIL_USERNAME,
      },
      to: to,
      subject: subject,
      html: content,
    };
    if (attachments) {
      message.attachments = attachments;
    }
    const sentEmail = await transporter.sendMail(message);
    console.log("sentEmail", sentEmail);
    if (!sentEmail) {
      return {
        hasError: true,
        message: "Error while sending email",
      };
    }
    return {
      hasError: false,
      message: "Email sent successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      hasError: true,
      message: "Error while sending email",
    };
  }
};
