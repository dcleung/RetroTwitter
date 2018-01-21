var express = require('express');
var router = express.Router();
var Twitter = require('twitter');
var credentials = require('./config.json');
var AWS = require('aws-sdk');
var Jimp = require("jimp");

var request = require('request');

var translate = require('./dictionary.json')

// Maximum number of tweets to appear (keep small for testing purposes)
var MAX_COUNT = 10;

AWS.config = {
  "accessKeyId": credentials.aws_access_key,
  "secretAccessKey": credentials.aws_secret_key,
  "region": "us-east-1"
};

var s3 = new AWS.S3();
var rekognition = new AWS.Rekognition();

// Uploads the pic at the URL to S3
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

// Run Rekognition on the current picture
function putCallback() {
    runRekognition({Image:{'S3Object':{'Bucket':'pennbook-my-images','Name':'current.png'}}});
}

function runRekognition(searchParams) {
    rekognition.detectFaces(searchParams, function (err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        } else {
            console.log('Uploaded data successfully!'); 
            replacePic(data);
        }
    });
}

// Replace the current picture with the retro-fied picture
function replacePic(data) {
    //console.log(data.FaceDetails);
    var leftEyeX = 0;
    var leftEyeY = 0;
    var rightEyeX = 0;
    var rightEyeY = 0;
    var width = data.FaceDetails[0].BoundingBox.Width;

    data.FaceDetails[0].Landmarks.forEach(function(landmark) {
        if (landmark.Type === 'eyeLeft') {
            leftEyeX = landmark.X;
            leftEyeY = landmark.Y;
        }

        if (landmark.Type === 'eyeRight') {
            rightEyeX = landmark.X;
            rightEyeY = landmark.Y;
        }
    });

    if (leftEyeX && leftEyeY && leftEyeX && leftEyeY) {
        var distance = rightEyeX - leftEyeX;
        var avgX = (rightEyeX + leftEyeX) / 2;
        var avgY = (rightEyeY + leftEyeY) / 2;
        var newX = avgX * 250 - 72; 
        var newY = avgY * 250 - 80;
        console.log("( " + newX + ", " + newY + ")");
        console.log(distance);

        // Compute where to put the afro image

        // Have JIMP read the afro image
        Jimp.read("./routes/resources/afro1.png", function (err, overlay) {
            if (!err) {
                // Alter the overlay image
                overlay.scale(distance * 0.80);
                // Have JIMP read the image for the Twitter profile
                var params = {Bucket: 'pennbook-my-images', Key: 'current.png'};
                var url = s3.getSignedUrl('getObject', params);
                //console.log('The URL is', url);
                Jimp.read(url, function (err, profile) {
                    if (!err) {
                        profile.resize(250, 250).composite(overlay, newX, newY); 
                        var file = "./public/new." + profile.getExtension();
                        profile.write(file)
                    } else {
                        console.log(err);
                    }
                });
            } else {
                console.log(err);
            }
        });
    }
}
 
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

        convertPic(tweets[0].user.profile_image_url);

        res.render('index', { tweets: retTweets});
      } else {
        console.log(error);
      }
    });
});

// Make input text retro
var convertText = function(text) {
    var words = text.split(" ");
    var tweet = "";
    for(var i = 0; i < words.length; i++){
        var word = words[i];
        if(word[word.legnth-1] === "."){
            word = words[i].substring(0, word.length-1);
            word = (translate[word] ? translate[word] : word);
            word = word + ".";
        } else {
            word = (translate[word] ? translate[word] : word);
            word = word + " ";
        }
        tweet = tweet + word;
    }
    return tweet;
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
