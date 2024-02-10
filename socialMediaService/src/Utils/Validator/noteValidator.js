import joi from "joi";

export const AddNoteValidator = joi.object({
  title: joi.string().required(),
  description: joi.string().required(),
});

export const UpdateNoteValidator = joi.object({
  title: joi.string(),
  description: joi.string(),
});
