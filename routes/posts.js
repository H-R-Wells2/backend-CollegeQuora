const { Router } = require("express");
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const { body, validationResult } = require('express-validator');
const fetchuser = require("../middleware/fetchuser");
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();




// to upload image to google drive
const { google } = require('googleapis')
const GOOGLE_API_FOLDER_ID = process.env.GOOGLE_API_FOLDER_ID
let idOfImage;




// to temporary save image
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname)
    }
});

const upload = multer({ storage: storage });







// ROUTE 1 : get all posts
router.get('/fetchallposts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const posts = await Post.find()
            .sort({ date: -1 })
            .limit(limit)
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: ['username', 'idOfAvatar']
                }
            });

        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});





// ROUTE 2 : get all posts with no comments
router.get('/no-comments', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const posts = await Post.find({ comments: [] })
            .sort({ date: -1 })
            .limit(limit)
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: ['username', 'idOfAvatar']
                }
            });

        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});





// ROUTE 5 : Get posts by searching the parameters
router.get('/search', async (req, res) => {
    try {
        const { title, description, tag } = req.query;

        const limit = parseInt(req.query.limit) || 10;
        // search for posts based on the given parameters
        const posts = await Post.find({
            $or: [
                { title: { $regex: title, $options: 'i' } },
                { description: { $regex: description, $options: 'i' } },
                { tag: { $regex: tag, $options: 'i' } },
            ]
        }).sort({ date: -1 })
            .limit(limit)
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: ['username', 'idOfAvatar']
                }
            }).sort({ date: -1 });

        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});




// ROUTE 3 : Get a single post by ID using: GET "api/posts/:id".
router.get('/:id', async (req, res) => {
    try {
        const post = await Post
        .findById(req.params.id)
        .populate('user')
        .populate('comments')
        .populate({
            path: 'comments',
            populate: {
                path: 'user',
                select: ['username', 'idOfAvatar']
            }
        });;

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send("Internal Server Error");
    }
});





// ROUTE 4 : get all posts of single user
router.get('/user/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const posts = await Post.find({ user: req.params.userId })
            .sort({ date: -1 })
            .limit(limit)
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: ['username', 'idOfAvatar']
                }
            });
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});



















// ROUTE 6 : Add posts of loggedin user using: POST "api/posts/addpost". Login required.
router.post('/addpost', fetchuser,
    // [
    //     body('title', 'Enter a valid title').isLength({ min: 3 }),
    //     body('description', 'Enter a valid description').isLength({ min: 3 }),
    // ],
    upload.single('attachedImage'), async (req, res) => {
        if (!req.user) {
            return res.status(401).json({ error: 'User not found, please login.' });
        }

        const { title, description, tag } = req.body;

        // saved in temporary folder
        if (req.file === undefined) {
            attachedImage = null;
        }
        else {
            attachedImage = req.file.path;
        }


        try {

            if (attachedImage !== null) {
                async function uploadFile() {
                    try {
                        const auth = new google.auth.GoogleAuth({
                            // keyFile: './routes/cqkey.json',
                            keyFile: '/etc/secrets/',
                            scopes: ['https://www.googleapis.com/auth/drive']
                        })

                        const driveService = google.drive({
                            version: 'v3',
                            auth
                        })

                        const fileMetaData = {
                            'name': req.file.filename,
                            'parents': [GOOGLE_API_FOLDER_ID]
                        }

                        const media = {
                            mimeType: 'image/jpg',
                            body: fs.createReadStream(attachedImage)
                        }

                        const response = await driveService.files.create({
                            resource: fileMetaData,
                            media: media,
                            field: 'id'
                        })
                        return response.data.id

                    } catch (err) {
                        console.log('Upload file error in google drive', err)
                    }
                }



                await uploadFile().then(data => {
                    idOfImage = data;
                    //https://drive.google.com/uc?export=view&id=
                })





                // If there are errors , return bad request and errors
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }

                const post = new Post({
                    title, description, tag, idOfImage, user: req.user.id
                });
                const savedPost = await post.save();

                res.json(savedPost);

                // to get username of user
                // console.log(req.user.id);

                setTimeout(() => {
                    fs.unlink(attachedImage, (err) => {
                        if (err) {
                            throw err;
                        }

                        console.log("File deleted successfully.");
                    });
                }, 40000);

            }
            else {

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

            }

        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }

    })









// ROUTE 7 : Update an existing post of loggedin user using: PUT "api/posts/updatepost". Login required.
router.put('/updatepost/:id', fetchuser, async (req, res) => {
    const { title, description, tag, comments } = req.body;

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
        if (comments) {
            newPost.comments = comments;
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

        post = await Post.findByIdAndUpdate(req.params.id, { $set: newPost }, { new: true }).populate('user').populate({
            path: 'comments',
            populate: { path: 'user' }
        });
        res.json({ post });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})









// ROUTE 8 : Delete a post of loggedin user using: DELETE "api/posts/deletepost". Login required.
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


});












// ROUTE 9 : Upvote a post
router.post('/:postId/upvote', fetchuser, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: ['username', 'idOfAvatar']
                }
            });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.upvotes.includes(req.user.id)) {
            return res.status(400).json({ error: 'Post already upvoted' });
        }

        // Remove the user's ID from the downvotes array of the post
        if (post.downvotes.includes(req.user.id)) {
            post.downvotes = post.downvotes.filter(id => id.toString() !== req.user.id.toString());
        }

        // Add the user's ID to the upvotes array of the post
        post.upvotes.push(req.user.id);
        await post.save();

        res.json(post);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});





// ROUTE 10 : Downvote a post
router.post('/:postId/downvote', fetchuser, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: ['username', 'idOfAvatar']
                }
            });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.downvotes.includes(req.user.id)) {
            return res.status(400).json({ error: 'Post already downvoted' });
        }

        if (post.upvotes.includes(req.user.id)) {
            post.upvotes = post.upvotes.filter(id => id.toString() !== req.user.id.toString());
        }

        // Add the user's ID to the downvotes array of the post
        post.downvotes.push(req.user.id);
        await post.save();

        res.json(post);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});












module.exports = router