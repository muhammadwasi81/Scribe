import { config } from "dotenv";
config();

const SmSCongig = {
  Account_Sid: process.env.ACCOUNT_SID,
  Auth_Token: process.env.AUTH_TOKEN,
};

export default SmSCongig;
