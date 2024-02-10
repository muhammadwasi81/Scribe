import pkg from "joi";
const { ValidationError } = pkg;
import CustomError from "./CustomError.js";
import CustomSuccess from "./CustomSuccess.js";

export const ResHandler = (err, req, res, next) => {
  // console.time("ResHandler");
  let StatusCode = err.status || 500;

  let Data = {
    data: err.Data,
    message: err.message,
    status: false,
  };
  if (err instanceof CustomSuccess) {
    StatusCode = err.status;
    Data = {
      message: err.message,
      data: err.Data,
      status: true,
    };
    // console.timeEnd("ResHandler");
    return res.status(StatusCode).json(Data);
  }
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

  // console.log(typeof err, err);
  // console.timeEnd("ResHandler");
  return res.status(StatusCode).json(Data);
};
