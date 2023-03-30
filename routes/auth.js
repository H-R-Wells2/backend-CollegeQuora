const express = require("express");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { response } = require("express");
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const fetchuser = require("../middleware/fetchuser");
const multer = require('multer');
const fs = require('fs');


const JWT_SECRET = 'HRWells';


// Just a message on web page about what we are doing at this endpoint
router.get('/createuser', (req, res) => {
  res.send("We are creating a user at this endpoint");
});

















// ROUTE 1:  Create a user using: POST "api/auth/createuser". No login required
router.post('/createuser',
  [
    body('firstName', 'Enter a valid name').isLength({ min: 2 }),
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
      let username = await User.findOne({ username: req.body.username });
      // Check whether the user with this email is already exists
      if (user) {
        return res.status(404).json({ error: "User already exist with this email id" })
      }

      if (username) {
        return res.status(404).json({ error: "Username already exists, please try another one" })
      }


      // Add salt 
      const salt = bcrypt.genSaltSync(10);
      const secPass = await bcrypt.hash(req.body.password, salt);



      // Create a user
      user = await User.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: secPass,
        username: req.body.username,
        collegeName: req.body.collegeName
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
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});










// to upload image to google drive
const { google } = require('googleapis')
const GOOGLE_API_FOLDER_ID = '1tb4d8fZUfRJWHTixZJdPYRsnlHmdau4j'



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




// ROUTE 4: Update user data using: PUT "api/users/update". Login required.
router.put('/updateuser', fetchuser, upload.single('attachedImage'), async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, username, collegeName } = req.body;

  // saved in temporary folder
  let idOfAvatar = null;
  if (req.file !== undefined) {
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
        body: fs.createReadStream(req.file.path)
      }

      const response = await driveService.files.create({
        resource: fileMetaData,
        media: media,
        field: 'id'
      })
      idOfAvatar = response.data.id;

    } catch (err) {
      console.log('Upload file error in google drive', err)
    }
  }

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.username = username || user.username;
    user.collegeName = collegeName || user.collegeName;
    user.idOfAvatar = idOfAvatar || user.idOfAvatar;

    const updatedUser = await user.save();
    res.json(updatedUser);

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
})





module.exports = router