import { createServer } from "http";

import { app } from "./appsub.js";
import workerPoolController from "./Utils/workerPool/workerPoolController.js";
// import {Server} from 'socket.io'
// import { socketEventListner } from './socketEventListener.js'
const httpServer = createServer(app);
// const io = new Server(httpServer)
const port = process.env.PORT || 3050;
// io.addListener('connection', socketEventListner)

const options = { minWorkers: 1, maxWorkers: 1 };
await workerPoolController.init(options);
httpServer.listen(port, async () => {
  console.log("Server listening on port " + port);
});
