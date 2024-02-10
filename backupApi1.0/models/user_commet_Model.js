const mongoose = require('mongoose');

const usercommentschema = new mongoose.Schema({
    usercomment: {
        type: String,
    },
    postid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userpost'
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },


})

usercommentschema.virtual('id').get(function () {
    return this._id.toHexString();
});

usercommentschema.set('toJSON', {
    virtuals: true,
});




exports.UserComment = mongoose.model('usercomment', usercommentschema);
exports.usercommentschema = usercommentschema;