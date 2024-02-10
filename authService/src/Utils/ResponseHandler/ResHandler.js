import pkg from "joi";
const { ValidationError } = pkg;
import CustomError from "./CustomError.js";
import CustomSuccess from "./CustomSuccess.js";

export const ResHandler = (err, req, res, next) => {
  let StatusCode = 500;
  console.time("ResHandler");
  let Data = {
    message: err.message,
    status: false,
  };
  if (err instanceof ValidationError) {
    StatusCode = 400;
    Data = {
      message: err.message,
      status: false,
    };
  }
  if (err instanceof CustomError) {
    StatusCode = err.status;
    Data = {
      message: err.message,
      status: false,
    };
  }

  // err instanceof CustomSuccess
  if (err instanceof CustomSuccess) {
    StatusCode = parseInt(err.status) ? parseInt(err.status) : 200;
    Data = {
      message: err.message,
      data: err.Data,
      status: true,
    };
    if (err.Data === null) {
      delete Data.data;
    }
  }

  console.timeEnd("ResHandler");
  return res.status(StatusCode).json(Data);
};
