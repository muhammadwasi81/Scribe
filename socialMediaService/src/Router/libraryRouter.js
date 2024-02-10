import { Router, application } from "express";
import * as libraryController from "../Controller/libraryController.js";
import { uploadMultipleImagesAndVideos } from "../Utils/MultipartData.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";

export const LibraryRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(LibraryRouter);
  this.use(path, middleware, LibraryRouter);
  return LibraryRouter;
};

LibraryRouter.route("/create_book").post([
  uploadMultipleImagesAndVideos.fields([
    {
      name: "cover",
      maxCount: 1,
    },
    {
      name: "manuscripts",
      maxCount: 1,
    },
  ]),
  authMiddleware,
  libraryController.createLibrary,
]);

LibraryRouter.route("/approve_book/:id").get(libraryController.approveBookById);

// LibraryRouter.route("/update_book/:bookId").put(authMiddleware, libraryController.updateBookById);
LibraryRouter.route("/update_book/:bookId").put([
  uploadMultipleImagesAndVideos.fields([
    {
      name: "cover",
      maxCount: 1,
    },
    {
      name: "manuscripts",
      maxCount: 1,
    },
  ]),
  authMiddleware,
  libraryController.updateBookById,
]);


LibraryRouter.route("/book/:bookId").get(authMiddleware, libraryController.getBookById);
LibraryRouter.route("/books").get(authMiddleware, libraryController.getBooks);  


// new one
LibraryRouter.route("/update_bookOne/:bookId").put([
  uploadMultipleImagesAndVideos.fields([
    {
      name: "cover",
      maxCount: 1,
    },
    {
      name: "manuscripts",
      maxCount: 1,
    },
  ]),
  authMiddleware,
  libraryController.updateBookByIdOne,
]);

