import { createServer } from "http";
// import { createServer as createSecureServer } from "http";
import { IoConnection } from "./Controller/SocketioController.js";
import { app } from "./appsub.js";
import { Server } from "socket.io";
export const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: "*"
  },
});

IoConnection();

const port = process.env.PORT || 3050;

// console.log(httpServer);
httpServer.listen(port, async () => {
  console.log("Server listening on port " + port);
});

// import { createServer } from "http";
// import fs from 'fs';
// import { createServer } from "https";
// import { IoConnection } from "./Controller/SocketioController.js";
// import { app } from "./appsub.js";

// const port = process.env.PORT || 3050;

// export const httpServer = createServer({
//     key: fs.readFileSync('/home/lookbookstagjump/ssl/keys/a47c4_7e0f9_801267912d8bec952f47de8a9e3d668f.key'),
//     cert: fs.readFileSync('/home/lookbookstagjump/ssl/certs/lookbookstag_jumppace_com_a47c4_7e0f9_1681171199_360b2ba5ac3258cf8ecf971d2c7f4f5a.crt'),
//     ca: fs.readFileSync('/home/lookbookstagjump/ssl/certs/ca.crt')

// }, app)

// IoConnection();

// httpServer.listen(port, async () => {
//     console.log("Server listening on port " + port)
// })
