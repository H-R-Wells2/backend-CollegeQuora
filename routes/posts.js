const { Router } = require("express");
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const { body, validationResult } = require('express-validator');
const fetchuser = require("../middleware/fetchuser");
const User = require("../models/User");
const multer = require('multer');
const fs = require('fs');



// to upload image to google drive
const { google } = require('googleapis')
const GOOGLE_API_FOLDER_ID = '1tb4d8fZUfRJWHTixZJdPYRsnlHmdau4j'
let idOfImage;








// to temporary save image
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null,'./uploads/')
    },
    filename: function(req, file, cb) {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname)
    }
});

const upload = multer({ storage: storage});






// ROUTE 1 : Get all posts of all users using: GET "api/posts/getuser".
router.get('/fetchallposts', async (req, res) => {
    try {
        const posts = await Post.find().populate('user');

        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})












// ROUTE 2 : Add posts of loggedin user using: POST "api/posts/addpost". Login required.
router.post('/addpost', fetchuser,
    // [
    //     body('title', 'Enter a valid title').isLength({ min: 3 }),
    //     body('description', 'Enter a valid description').isLength({ min: 3 }),
    // ],
    upload.single('attachedImage'), async (req, res) => {
        console.log(req.file);

        const { title, description, tag } = req.body;

        // saved in temporary folder
        attachedImage = req.file.path;


        try {

            async function uploadFile(){
                try{
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
            
                }catch(err){
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
            }, 40000);


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