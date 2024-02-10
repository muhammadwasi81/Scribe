const mongoose = require('mongoose');



const userpostschema = new mongoose.Schema({

    // post_title: {
    //     type: String,
    //     required: true
    // },
    post_description: {
        type: String,
        required: true
    },
    postAnonymouse: {
        type: Boolean,
        default: false
    },
    post_likes: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'users'
            },
            liketype: {
                type: Number,
                default: 0,
                //0: Thumbs, 1: haha, 2: love, 3: sad
            }
        }
    ],
    thumbnail: {
        type: String,
        required: false,
        default: null
    },
    post_image: {
        type: String,
        // required: true
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    comments: [
        {
            comment: {
                type: String,
                // required: true
            },
            mentions: [
                {
                    userid: {
                        type: mongoose.Schema.Types.ObjectId,
                        // required: true,
                        ref: 'users'
                    },
                    username: {
                        type: String,
                        // required: true
                    },
                }

            ],
            userid: {
                type: mongoose.Schema.Types.ObjectId,
                // required: true,
                ref: 'users'
            },
            like: {
                type: Number,
                default: 0

            },
            createdOn: {
                type: Date,
                default: Date.now
            },
            comments: [
                {
                    comment: {
                        type: String,
                        required: true
                    },
                    mentions: [
                        {
                            userid: {
                                type: mongoose.Schema.Types.ObjectId,
                                // required: true,
                                ref: 'users'
                            },
                            username: {
                                type: String,
                                // required: true
                            },
                        }

                    ],
                    userid: {
                        type: mongoose.Schema.Types.ObjectId,
                        // required: true,
                        ref: 'users'
                    },
                    like: {
                        type: Number,
                        default: 0

                    },
                    createdOn: {
                        type: Date,
                        default: Date.now
                    },

                }
            ],

        }
    ],
    createdOn: {
        type: Date,
        default: Date.now
    },
    lon: {
        type: String,
        default: ""
    },
    lat: {
        type: String,
        default: ""
    },
    emoji_link: {
        type: String,
        default: ""
    },
    post_type: {
        type: Number,
        required: true,
        
        // 0) Text 1) Image 2) Video 3) Location 4) File 5) Doc 6) Emoji

    },
    sharedby: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        ref: 'users'
    },
})


userpostschema.virtual('id').get(function () {
    return this._id.toHexString();
});

userpostschema.set('toJSON', {
    virtuals: true,
});
exports.UserPost = mongoose.model('userpost', userpostschema);

exports.userpostschema = userpostschema;
