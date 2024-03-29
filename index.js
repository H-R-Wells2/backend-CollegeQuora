const connectToMongo = require('./db')
const express = require('express')
var cors = require('cors')
require('dotenv').config();

connectToMongo();
const app = express()
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))

// Available Routes
app.get('/', (req, res) => {
  res.send('Hello it\'s H_R_Wells')
})
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));

app.listen(port, () => {
  console.log(`CollegeQuora listening on ${process.env.HOST}`);
})