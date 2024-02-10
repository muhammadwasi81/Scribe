import joi from "joi";

export const locationRequired = {
  lat: joi.number().min(-90).max(90).required(),
  long: joi.number().min(-180).max(180).required(),
};

export const deviceRequired = {
  //test the given deviceToken
  deviceToken: joi.string().required(),
  deviceType: joi.string().required().equal("android", "ios", "postman"),
};
