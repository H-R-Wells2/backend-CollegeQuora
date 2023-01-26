const express = require("express");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { response } = require("express");
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const fetchuser = require("../middleware/fetchuser");


const JWT_SECRET = 'VijayKumar';


// Just a message on web page about what we are doing at this endpoint
router.get('/createuser', (req, res) => {
  res.send("We are creating a user at this endpoint");
});

















// ROUTE 1:  Create a user using: POST "api/auth/createuser". No login required
router.post('/createuser',
  [
    body('name', 'Enter a valid name').isLength({ min: 2 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be atleast 5 char').isLength({ min: 5 })
  ],


  async (req, res) => {
    let success = false;



    // If there are errors , return bad request and errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }



    try {
      let user = await User.findOne({ email: req.body.email });
      // Check whether the user with this email is already exists
      if (user) {
        return res.status(404).json({ error: "User already exist with this email id" })
      }


      // Add salt 
      const salt = bcrypt.genSaltSync(10);
      const secPass = await bcrypt.hash(req.body.password, salt);



      // Create a user
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPass,
      })


      const data = {
        user: {
          id: user.id
        }
      }
      const authToken = jwt.sign(data, JWT_SECRET);
      success = true;


      // res.json(user)
      res.json({ success, authToken });



    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error")
    }
  })




















// ROUTE 2 : Authenticate a user using: POST "api/auth/login". No Login required.
router.post('/login',
  [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be atleast 5 char').isLength({ min: 5 })
  ],


  async (req, res) => {
    let success = false;



    // If there are errors , return bad request and errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }


    // Check emails and password for login
    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Please check your id or password" })
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({ success, error: "Please check your id or password" })
      }

      const data = {
        user: {
          id: user.id
        }
      }
      const authToken = jwt.sign(data, JWT_SECRET);
      success = true;
      // res.json(user)
      res.json({ success, authToken });

    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error")
    }
  })













// ROUTE 3 : Get loggedin user datils using: POST "api/auth/getuser". Login required.
router.post('/getuser', fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error")
  }
})

module.exports = router