
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();
const _ = require("lodash");



mongoose.connect("mongodb+srv://amigo_blog:Test123@cluster0.dbkp6.mongodb.net/servicesDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const itemSchema = {
  name : String,
  price : Number,
  img : String
};


const cartSchema = {
  userId : String, 
  productId : String,
  name : String,
  price : Number,
  img : String
};


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret : "our little secret.",
  resave : false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//////////////////////////////////google OAuth ///////////////////////////////////////////////////////

const userSchema = new mongoose.Schema ({
  email : String, 
  password : String,
  googleId : String
});

userSchema.plugin(passportLocalMongoose); 
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
 
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "/auth/google/secrets",
    proxy: true
  },
  function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id, }, function (err, user) {
      return cb(err, user);
    });
  }
));

/////////////-----------------------------//////////////

const AvailableItem = mongoose.model("AvailableItem", itemSchema);
const CartItem = new mongoose.model("CartItem", cartSchema);

const homeStartingContent = "My Cart";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";





app.get("/", function(req, res){
   if(req.isAuthenticated()){
      CartItem.find({userId : req.user.username}, function(err, posts){
         res.render("home", {
            startingContent: homeStartingContent,
            posts: posts
       });
         // console.log(req.user.username);

    });
    }else {
      res.redirect("/register");
    }

});
////////////////authentication//////////////////////


app.get('/auth/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/home");
  });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});
app.get("/home", function(req, res){
    res.redirect("/");
});


//////////////////////////////////////////removing a post////////////////////////////////////////////////
app.get("/delete/:postId", function(req, res){
    const post = req.params.postId;
      CartItem.findOneAndDelete({_id : post, userId : req.user.username}, function(err){
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
});


app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){
     User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      })
    }
  });
});

app.post("/login", function(req, res){
 const user = new User({
  username : req.body.username,
  password : req.body.password
 });

  req.login(user, function(err){
      if(err){
        res.redirect("/register");
      }else{
       passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      })
      }
  });
});


///////////////------------------------------//////////////




app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.get("/compose", function(req, res){
  res.render("compose");
});

app.post("/compose", function(req, res){
  const availableItem = new AvailableItem({
    name: req.body.postTitle,
    price: req.body.postBody,
    img : req.body.postImage
  });

   availableItem.save();
   res.redirect("/front-page");
 });


app.get("/posts/:postId", function(req, res){
  const requestedPostId = req.params.postId;

  AvailableItem.findOne({_id : requestedPostId}, function(err, post){
     res.render("post", {
        title : post.title,
        content : post.content
     });
  });
  // posts.forEach(function(post){
  //   const storedTitle = _.lowerCase(post.title);

  //   if (storedTitle === requestedTitle) {
  //     res.render("post", {
  //       title: post.title,
  //       content: post.content
  //     });
  //   }
  // });

});


app.get("/success", function(req, res){
   res.send("success");
});
/////////////////////////////demo front page ////////////////////////////////////////

app.get("/front-page", function(req, res){
    AvailableItem.find({}, function(err, availableItems){
         res.render("frontPage", {
            availableItems: availableItems
       });
    });
});


///////////////////////////////////////////////////to add item item to cart, send a post req with route "/add-item/postId" ////////// 
app.post("/add-to-cart/:postId", function(req, res) {
   const requestedPostId = req.params.postId;

  CartItem.find({productId : requestedPostId, userId : req.user.username}, function(err, availableItems){
  if(!availableItems.length)
  {
  AvailableItem.findOne({_id : requestedPostId}, function(err, item){
     const newItem = new CartItem({
    userId : req.user.username,
    productId : requestedPostId,
    name: item.name,
    price: item.price,
    img : item.img
  });
     // console.log(req.username);

   newItem.save();
  });
}
});
  
  //  popup.alert({
  //   content: 'added to cart'
  // });
    // toast("A new game has been added to your cart");

   res.redirect("/front-page");
  
});




/////////////////////////----------------------//////////////////////
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function() {
  console.log("Server started successfully");
});


///google credentials :- https://evening-headland-54486.herokuapp.com/auth/google/secrets

