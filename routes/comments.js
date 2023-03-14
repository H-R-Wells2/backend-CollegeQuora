const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const fetchuser = require("../middleware/fetchuser");
const mongoose = require('mongoose');
const Post = require("../models/Post");







router.post('/addComment', fetchuser, async (req, res) => {
    const { comment, postId } = req.body;

    try {
        // Check if comment is empty
        if (!comment) {
            return res.status(400).json({ msg: "Comment cannot be empty" });
        }

        // Check if post ID is valid
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ msg: "Invalid post ID" });
        }

        // Create new comment with provided user ID and post ID
        const newComment = new Comment({
            comment,
            user: req.user.id,
            postId: postId
        });

        // Save comment to database
        const savedComment = await newComment.save();

        // Update post document to add comment id to comments array
        const post = await Post.findById(postId);
        post.comments.push(savedComment._id);
        await post.save();

        res.json(savedComment);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});





module.exports = router;