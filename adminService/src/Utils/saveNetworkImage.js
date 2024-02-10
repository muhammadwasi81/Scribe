import { writeFile } from "fs";
import fetch from "node-fetch";
import { uid } from "uid/secure";
import axios from "axios";
import { config } from "dotenv";

config();

// change this code to only use axios or node fetch short on ETA just copy pasting bits and pieces
export const saveNetworkImage = async (url) => {
  const networkImage = await fetch(url).catch(function (err) {
    console.log(err);
  });
  try {
    if (networkImage.status === 200) {
      const extension = networkImage.headers.get("content-type").split("/").pop();
      const profilePic = await networkImage.arrayBuffer().then((buffer) => Buffer.from(buffer));
      const contentType = networkImage.headers.get("content-type").mimetype;
      const fileName = uid(16) + "." + extension;
      const serviceUrl = process.env.SERVICE_URL;
      if (!serviceUrl) throw new Error("Service url not found");
      if (!contentType) throw new Error("Content type not found");
      if (!fileName) throw new Error("File name not found");
      if (!profilePic) throw new Error("Profile pic not found");
      const options = {
        method: "post",
        url: serviceUrl,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
        data: profilePic,
      };

      axios(options).catch((error) => {
        console.log("error in file upload => ", error);
        return {
          hasError: true,
          message: "Error while storing image",
        };
      });
      const image = `./public/uploads/${fileName}`.replace("./", "/");

      await writeFile("." + image, profilePic, (err) => {
        if (err) console.log(err);
      });
      return {
        hasError: false,
        image,
      };
    } else {
      console.log("failed network image ", networkImage);
      return {
        hasError: true,
        message: "Error while fetching image",
      };
    }
  } catch (e) {
    console.log(e);
    return {
      hasError: true,
      message: e.message,
    };
  }
};
