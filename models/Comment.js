const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommentSchema = new Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    postId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
    },
    comment: {
        type: String,
        required: true
    },
    votes:{
        type: Number
    }
});



const Comment = mongoose.model('comments', CommentSchema);
module.exports = Comment;