const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
require('dotenv/config');
const api = process.env.API_URL;

const https = require("https");
const fs = require("fs");


var cors = require('cors');
app.use(cors());
//route
const auth = require('./controllers/user_Auth_Controllers');
const userreview = require('./controllers/user_Review_Controllers');
const usersubscription = require('./controllers/user_Subscription_Controllers');
const userpost = require('./controllers/user_Post_Controllers');
const usernote = require('./controllers/user_Note_Controllers');
const userlibrary = require('./controllers/user_Libarary_Controllers');
const userfeed = require('./controllers/user_Feed_Controllers');
const userchat = require('./controllers/user_Chat_Controllers');
const userquestion = require('./controllers/user_Question_Controller');
const usernotification = require('./controllers/user_Notification_Controllers');
const usercomment = require('./controllers/user_comment_controllers');

//middleware
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(`${api}`, auth);
app.use(`${api}`, userreview);
app.use(`${api}`, usersubscription);
app.use(`${api}`, userpost);
app.use(`${api}`, usernote);
app.use(`${api}`, userlibrary);
app.use(`${api}`, userfeed);
app.use(`${api}`, userchat);
app.use(`${api}`, userquestion);
app.use(`${api}`, usernotification);
app.use(`${api}`, usercomment);

app.use("/public/uploads", express.static(__dirname + "/public/uploads"));

mongoose.connect(process.env.COLLECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'scribble_production'
})
    .then(() => {
        console.log('database is connected')
    })
    .catch(() => {
        console.log('database is not connected')
    })

app.get('/', (req, res) => {
    res.send(`${api}/oo`)
});

const PORT = process.env.PORT || 3017;

https
    .createServer(
        // Provide the private and public key to the server by reading each
        // file's content with the readFileSync() method.
        {
            key: fs.readFileSync("key.pem"),
            cert: fs.readFileSync("cert.pem"),
        },
        app
    )
    .listen(PORT, () => {
        console.log(`App listening on port ${PORT}!`)
    });
// app.listen(PORT, () => { console.log(`App listening on port ${PORT}!`); });