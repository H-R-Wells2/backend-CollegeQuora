const { Router } = require("express");
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const { body, validationResult } = require('express-validator');
const fetchuser = require("../middleware/fetchuser");
const multer = require('multer');
const fs = require('fs');



// to upload image to google drive
const { google } = require('googleapis')
const GOOGLE_API_FOLDER_ID = '1tb4d8fZUfRJWHTixZJdPYRsnlHmdau4j'
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




router.get('/fetchallposts', async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ date: -1 })
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username'
                }
            });

        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})





// ROUTE 2 : Get posts by searching the parameters
router.get('/search', async (req, res) => {
    try {
        const { title, description, tag } = req.query;

        // search for posts based on the given parameters
        const posts = await Post.find({
            $or: [
                { title: { $regex: title, $options: 'i' } },
                { description: { $regex: description, $options: 'i' } },
                { tag: { $regex: tag, $options: 'i' } },
            ]
        }).sort({ date: -1 }).populate('user').populate('comments');

        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});








// ROUTE 3 : Add posts of loggedin user using: POST "api/posts/addpost". Login required.
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
                            keyFile: './routes/cqkey.json',
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

                        console.log("Delete File successfully.");
                    });
                }, 10000);

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

                // to get username of user
                // console.log(req.user.id);

            }

        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }

    })









// ROUTE 4 : Update an existing post of loggedin user using: PUT "api/posts/updatepost". Login required.
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









// ROUTE 5 : Delete a post of loggedin user using: DELETE "api/posts/deletepost". Login required.
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








// ROUTE 6: Get a single post by ID using: GET "api/posts/:id".
router.get('/:id', async (req, res) => {
    try {
      const post = await Post.findById(req.params.id).populate('user').populate('comments');
      
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

  





module.exports = router