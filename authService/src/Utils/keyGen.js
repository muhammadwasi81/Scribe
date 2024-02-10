// // Crypto generator for public key and private key for the jwt token
import * as Jose from "jose";
import fs from "fs";
const jose = Jose;
export const keyGenenerator = async () => {
  try {
    const privateKey = await jose.importPKCS8(
      fs.readFileSync("./privateKey.pem").toString(),
      "pem"
    );
    const publicKey = await jose.importSPKI(
      fs.readFileSync("./publicKey.pem").toString(),
      "pem"
    );
    if (privateKey && publicKey) {
      return { privateKey, publicKey };
    }
  } catch (error) {
    console.warn("generating new keys");
  }
  const secret = await jose.generateKeyPair("PS256", {
    extractable: true,
    modulusLength: 2048,
    crv: "P-256",
  });
  fs.writeFileSync(
    "./privateKey.pem",
    await jose.exportPKCS8(secret.privateKey)
  );
  fs.writeFileSync("./publicKey.pem", await jose.exportSPKI(secret.publicKey));
  return secret;
};

const keyGen = await keyGenenerator();
export default keyGen;
