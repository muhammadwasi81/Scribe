import bcrypt from "bcrypt";
import { config } from "dotenv";
import { appendFileSync } from "fs";
config();
let salt = process.env.SALT;

let genSalt = salt;
if (!salt) {
  genSalt = bcrypt.genSaltSync(8);
  appendFileSync("./.env", "\nSALT= " + genSalt);
}
export { genSalt };
