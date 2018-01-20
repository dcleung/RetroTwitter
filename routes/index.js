var express = require('express');
var router = express.Router();
var Twitter = require('twitter');
var credentials = require('./config.json');

var MAX_COUNT = 30;
 
// Initialize the Twitter API Keys
var client = new Twitter({
  consumer_key: credentials.consumer_key,
  consumer_secret: credentials.consumer_secret,
  access_token_key: credentials.access_token_key,
  access_token_secret: credentials.access_token_secret
});
 
// Set the username in question
var params = {screen_name: 'realDonaldTrump', count: MAX_COUNT, exclude_replies: true, include_rts: false, tweet_mode:'extended'};

/* GET home page. */
router.get('/', function(req, res, next) {
    client.get('statuses/user_timeline', params, function(error, tweets, response) {
      if (!error) {
        console.log(tweets);
        res.render('index', { tweets: tweets });
      } else {
        console.log(error);
      }
    });
});

module.exports = router;
