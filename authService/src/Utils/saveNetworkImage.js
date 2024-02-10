import fs from "fs";
import { writeFile } from "fs/promises";
import axios from "axios";
import { uid } from "uid/secure";
import FormData from "form-data";
import { config } from "dotenv";

config();

export const saveNetworkImage = async (url) => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    if (response.status === 200) {
      const contentType = response.headers["content-type"];
      const extension = contentType.split("/").pop();
      const profilePic = Buffer.from(response.data);

      const fileName = uid(16) + "." + extension;
      const serviceUrl = process.env.SERVICE_URL;
      if (!serviceUrl) throw new Error("Service URL not found");
      if (!contentType) throw new Error("Content type not found");
      if (!fileName) throw new Error("File name not found");
      if (!profilePic) throw new Error("Profile pic not found");

      const image = `./public/uploads/${fileName}`;
      await writeFile(image, profilePic);

      const formData = new FormData();
      formData.append("image", fs.createReadStream(image), { filename: fileName, contentType });

      const headers = {
        ...formData.getHeaders(),
      };

      await axios.post(serviceUrl, formData, { headers });

      fs.unlinkSync(image);

      return {
        hasError: false,
        image,
      };
    } else {
      console.log("failed network image", response);
      return {
        hasError: true,
        message: "Error while fetching image",
      };
    }
  } catch (error) {
    console.log("Error:", error);
    return {
      hasError: true,
      message: error.message,
    };
  }
};