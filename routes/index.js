var express = require('express');
var router = express.Router();
var Twitter = require('twitter');
var credentials = require('./config.json');
var AWS = require('aws-sdk');

var request = require('request');

AWS.config = {
  "accessKeyId": credentials.aws_access_key,
  "secretAccessKey": credentials.aws_secret_key,
  "region": "us-east-1"
};

var s3 = new AWS.S3();
var rekognition = new AWS.Rekognition();

function put_from_url(url, bucket, key, callback) {
    request({
        url: url,
        encoding: null
    }, function(err, res, body) {
        if (err)
            console.log(err);

        s3.putObject({
            Bucket: bucket,
            Key: key,
            Body: body,
            ACL: 'public-read'
        }, callback);
    })
}

function putCallback() {
    runRekognition({Image:{'S3Object':{'Bucket':'pennbook-my-images','Name':'current.png'}}});
}

function runRekognition(searchParams) {
    rekognition.detectFaces(searchParams, function (err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        } else {
            console.log('Uploaded data successfully!'); 
            console.log(data.FaceDetails[0].Landmarks);
        }
    });
}

function replace(data) {

}

// Maximum number of tweets to appear (keep small for testing purposes)
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

    // Set the Twitter handle in question
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
    put_from_url(pic, 'pennbook-my-images', 'current.png', function(err, res) {
        if (err) {
            throw err;
        } else {
            putCallback();
        }
    });
    return pic;
}

module.exports = router;
