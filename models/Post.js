const mongoose = require('mongoose');
const { Schema } = mongoose;

const PostsSchema = new Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    tag: {
        type: String,
        required: true,
        default:"Genaral"
    },
    idOfImage: {
        type: String
    },
    date:{
        type:Date,
        default:Date.now
    }
});

module.exports = mongoose.model('posts', PostsSchema);