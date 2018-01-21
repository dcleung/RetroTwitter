var express = require('express');
var router = express.Router();
var Twitter = require('twitter');
var credentials = require('./config.json');
var aws = require('aws-sdk');

// Assign AWS Keys
var aws_access_key = aws.aws_access_key;
var aws_secret_key = aws.aws_access_key;

var MAX_COUNT = 20;
 
// Initialize the Twitter API Keys
var client = new Twitter({
  consumer_key: credentials.consumer_key,
  consumer_secret: credentials.consumer_secret,
  access_token_key: credentials.access_token_key,
  access_token_secret: credentials.access_token_secret
});


/* GET home page. */
router.get('/', function(req, res, next) {

    // Set the username in question
    var params = {screen_name: req.query.q, count: MAX_COUNT, exclude_replies: true, include_rts: 0, tweet_mode:'extended'};
    
    client.get('statuses/user_timeline', params, function(error, tweets, response) {
      if (!error) {
        var retTweets = new Array();
        tweets.forEach(function(tweet) {
            tweet.full_text = convertText(tweet.full_text);
            retTweets.push(tweet);
        });

        var newProfile = convertPic(tweets[0].user.profile_image_url);

        res.render('index', { tweets: retTweets, profile: newProfile});
      } else {
        console.log(error);
      }
    });
});

// Make input text retro
var convertText = function(text) {
    return text;
}

// Make input picture retro
var convertPic = function(pic) {
    // Makes the twitter picture high quality
    pic = pic.replace('_normal','');
    return pic;
}

module.exports = router;
