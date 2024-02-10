import pkg from 'joi';
const { ValidationError } = pkg;
import CustomError from "./CustomError.js";

export const ResHandler = (err, req, res, next) => {
    let StatusCode = 500;
    let Data = {
        message: err.message,
        status: false
    }
    if (err instanceof ValidationError) {
        StatusCode = 400;
        Data = {
            message: err.message,
            status: false
        }
    }
    if (err instanceof CustomError) {
        StatusCode = err.status;
        Data = {
            message: err.message,
            status: false
        }
    }

    return res.status(StatusCode).json(Data);
}

