const { Router } = require("express");
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const { body, validationResult } = require('express-validator');
const fetchuser = require("../middleware/fetchuser");



// ROUTE 1 : Get all posts of all users using: GET "api/posts/getuser".
router.get('/fetchallposts', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})












// ROUTE 2 : Add posts of loggedin user using: POST "api/posts/addpost". Login required.
router.post('/addpost', fetchuser, [
    body('title', 'Enter a valid title').isLength({ min: 3 }),
    body('description', 'Enter a valid title').isLength({ min: 3 }),
], async (req, res) => {
    const { title, description, tag } = req.body;

    try {

        // If there are errors , return bad request and errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const post = new Post({
            title, description, tag, user: req.user.id
        });
        const savedPost = await post.save();

        res.json(savedPost);


        // to get username of user
        console.log(req.user.id);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})










// ROUTE 3 : Update an existing post of loggedin user using: PUT "api/posts/updatepost". Login required.
router.put('/updatepost/:id', fetchuser, async (req, res) => {
    const { title, description, tag } = req.body;

    try {

        // Create newPost object
        const newPost = {};
        if (title) {
            newPost.title = title;
        }
        if (description) {
            newPost.description = description;
        }
        if (tag) {
            newPost.tag = tag;
        }


        // Find the post which want to update and update it.
        let post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send("Sorry Not Found")
        };
        // Allow to update only if user owns this post
        if (post.user.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed")
        }

        post = await Post.findByIdAndUpdate(req.params.id, { $set: newPost }, { new: true });
        res.json({ post });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }


})












// ROUTE 4 : Delete a post of loggedin user using: DELETE "api/posts/deletepost". Login required.
router.delete('/deletepost/:id', fetchuser, async (req, res) => {

    try {

        // Find the post which want to delete and delete it.
        let post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send("Sorry Not Found")
        };

        // Allow deletion only if user owns this post
        if (post.user.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed")
        }

        post = await Post.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Post has been deleted", post: post });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }


})

module.exports = router