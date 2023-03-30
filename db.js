const mongoose = require('mongoose');
// const mongoURI = "mongodb+srv://hrwells10246:kFeJtcP2TM9sK645@collegequora.gfydywd.mongodb.net/?retryWrites=true&w=majority";
const mongoURI = "mongodb+srv://hrwells10246:kFeJtcP2TM9sK645@collegequora.gfydywd.mongodb.net/collegeQuora?retryWrites=true&w=majority";

mongoose.set("strictQuery", false);
mongoose.set("strictPopulate", false);
const connectToMongo = ()=>{
    mongoose.connect(mongoURI,()=>{
        console.log("connected to mongo successfully");
    })
}

module.exports=connectToMongo;