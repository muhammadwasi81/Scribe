import fetch from "node-fetch";
import { config } from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { saveNetworkImage } from "./saveNetworkImage.js";

config();
export const accessTokenValidator = async (accessToken, socialType) => {
  const { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, GOOGLE_CLIENT_ID } = process.env;
  let name, identifier, dateOfBirth, profilePic, gender, imageUrl;
  switch (socialType) {
    case "facebook": {
      if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        return {
          hasError: true,
          message: "Facebook app id or secret is not provided",
        };
      }
      const { data } = await fetch(
        `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`,
      ).then((r) => r.json());

      // console.log("data => ", data);
      if (!data.is_valid && data.error) {
        return {
          hasError: true,
          message: data.error.message,
        };
      }
      const { user_id } = data;
      const getUserData = await fetch(
        `https://graph.facebook.com/${user_id}?fields=id,name,email,picture,age_range,gender,birthday&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`,
      ).then((r) => {
        return r.json();
      });
      name = getUserData.name;
      imageUrl = getUserData.picture.data.url;

      // console.log("image => ", getUserData.picture);
      gender = getUserData.gender;
      identifier = user_id;
      dateOfBirth = getUserData.birthday;

      // console.log("identifier accessTokenValidator => ", identifier);
      break;
    }
    case "google": {
      if (!GOOGLE_CLIENT_ID) {
        return {
          hasError: true,
          message: "Google client id is not provided",
        };
      }
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const googleResponse = await client.verifyIdToken({
        idToken: accessToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const data = googleResponse.getPayload();
      console.log("data => ", data);
      if (!data.aud && data.error) {
        return {
          hasError: true,
          message: data.error.message,
        };
      }
      name = data.name;
      imageUrl = data.picture;
      identifier = data.sub;
      break;
    }
    case "apple": {
      return {
        hasError: true,
        message: "Apple login is not supported yet",
      };
    }
    default: {
      return {
        hasError: true,
        message: "Invalid social type",
      };
    }
  }
  const { hasError, message, image } = await saveNetworkImage(imageUrl);
  if (hasError) {
    return {
      hasError: true,
      message,
    };
  }

  return {
    hasError: false,
    data: {
      name,
      image,
      identifier,
      dateOfBirth,
      profilePic,
      gender,
    },
  };
};
