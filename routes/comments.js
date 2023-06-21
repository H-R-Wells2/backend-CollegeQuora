const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const fetchuser = require("../middleware/fetchuser");
const mongoose = require('mongoose');
const Post = require("../models/Post");






// Route for Comment
router.post('/addComment', fetchuser, async (req, res) => {
    const { comment, postId } = req.body;

    try {
        if (!comment) {
            return res.status(400).json({ msg: "Comment cannot be empty" });
        }

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ msg: "Invalid post ID" });
        }

        const newComment = new Comment({
            comment,
            user: req.user.id,
            postId: postId
        });

        const savedComment = await newComment.save();

        const post = await Post.findById(postId);
        post.comments.push(savedComment._id);
        await post.save();

        res.json(savedComment);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});



// Route for deleting a comment
router.delete('/deleteComment/:id', fetchuser, async (req, res) => {
  const commentId = req.params.id;

  try {
      // Check if comment ID is valid
      if (!mongoose.Types.ObjectId.isValid(commentId)) {
          return res.status(400).json({ msg: "Invalid comment ID" });
      }

      // Find comment and check if user has permission to delete it
      const comment = await Comment.findById(commentId);
      if (!comment) {
          return res.status(404).json({ msg: "Comment not found" });
      }
      if (comment.user.toString() !== req.user.id) {
          return res.status(401).json({ msg: "User not authorized" });
      }

      // Delete comment from database
      await comment.remove();

      // Update post document to remove comment ID from comments array
      const post = await Post.findById(comment.postId);
      post.comments = post.comments.filter(id => id.toString() !== commentId);
      await post.save();

      res.json({ msg: "Comment deleted" });

  } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
  }
});




// Get all posts in which user commented
router.get('/user/:userId/posts', async (req, res) => {
    try {
      const posts = await Post.find()
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
            match: { _id: req.params.userId }
          }
        })
        .exec();
  
      const userPosts = posts.filter(post => {
        return post.comments.some(comment => comment.user !== null);
      });
  
      res.json(userPosts);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    }
  });




  

// Upvote a comment
router.post('/:commentId/upvote', fetchuser, async (req, res) => {
  try {
      const comment = await Comment.findById(req.params.commentId)
      .populate('user');

      if (!comment) {
          return res.status(404).json({ error: 'Answer not found' });
      }

      if (comment.upvotes.includes(req.user.id)) {
          return res.status(400).json({ error: 'Answer already upvoted' });
      }

      if (comment.downvotes.includes(req.user.id)) {
          comment.downvotes = comment.downvotes.filter(id => id.toString() !== req.user.id.toString());
      }

      comment.upvotes.push(req.user.id);
      await comment.save();

      res.json(comment);
  } catch (error) {
      console.error(error.message);
      res.status(500).send('Internal Server Error');
  }
});





// Downvote a comment
router.post('/:commentId/downvote', fetchuser, async (req, res) => {
  try {
      const comment = await Comment.findById(req.params.commentId)
      .populate('user');

      if (!comment) {
          return res.status(404).json({ error: 'Answer not found' });
      }

      if (comment.downvotes.includes(req.user.id)) {
          return res.status(400).json({ error: 'Answer already downvoted' });
      }

      if (comment.upvotes.includes(req.user.id)) {
          comment.upvotes = comment.upvotes.filter(id => id.toString() !== req.user.id.toString());
      }

      comment.downvotes.push(req.user.id);
      await comment.save();

      res.json(comment);
  } catch (error) {
      console.error(error.message);
      res.status(500).send('Internal Server Error');
  }
});



  




module.exports = router;