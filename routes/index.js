var express = require('express');
var router = express.Router();
var Twitter = require('twitter');
var credentials = require('./config.json');
var AWS = require('aws-sdk');
var Jimp = require("jimp");

var request = require('request');

var translate = require('./dictionary.json')

// Maximum number of tweets to appear (keep small for testing purposes)
var MAX_COUNT = 50;

AWS.config = {
  "accessKeyId": credentials.aws_access_key,
  "secretAccessKey": credentials.aws_secret_key,
  "region": "us-east-1"
};

// Set up S3
var s3 = new AWS.S3();

// Set up Rekognition
var rekognition = new AWS.Rekognition();

// Set up Comprehend
var comprehend = new AWS.Comprehend();

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

    // Case with no faces
   if (!data.FaceDetails[0]) {
        var params = {Bucket: 'pennbook-my-images', Key: 'current.png'};
        var url = s3.getSignedUrl('getObject', params);
         Jimp.read(url, function (err, profile) {
            if (!err) {
                var file = "./public/new." + profile.getExtension();
                profile.write(file)
            } else {
                console.log(err);
            }
        });
        return;
    }
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
        // Have JIMP read the afro image
        var distance = rightEyeX - leftEyeX;
        var avgX = (rightEyeX + leftEyeX) / 2;
        var avgY = (rightEyeY + leftEyeY) / 2;

        // Get the regression factor
        var scaling = distance * 5.5;
        var newX = (avgX * 1759 - (1759 * scaling / 2)); 
        var newY = (avgY * 1759 - 1000 * scaling);
        console.log("( " + newX + ", " + newY + ")");
        console.log(distance);

        // Have JIMP read the afro image
        Jimp.read("./routes/resources/afro1.png", function (err, overlay) {
            if (!err) {
                // Alter the overlay image
                overlay.scale(scaling);
                // Have JIMP read the image for the Twitter profile
                var params = {Bucket: 'pennbook-my-images', Key: 'current.png'};
                var url = s3.getSignedUrl('getObject', params);
                //console.log('The URL is', url);
                Jimp.read(url, function (err, profile) {
                    if (!err) {
                        profile.resize(1759, 1759).composite(overlay, newX, newY); 
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
            tweet.new_text = runNLP(tweet.full_text);
            tweet.new_text = convertText(tweet.new_text);
            retTweets.push(tweet);
        });
        if (!tweets[0]) {
            res.render('index', { tweets: new Array(), error: "User could not be found."});
        } else {
            convertPic(tweets[0].user.profile_image_url);
        }

        setTimeout(function() {res.render('index', { tweets: retTweets, error: null})}, 2000)
        
      } else {
            res.render('index', { tweets: new Array(), error: "User could not be found."});
      }
    });
});

// Make input text retro
var convertText = function(text) {
    var words = text.split(" ");
    var tweet = "";
    for(var i = 0; i < words.length; i++){
        var word = words[i];
        if(word[word.length-1] === "."){
            word = words[i].substring(0, word.length-1);
            word = (translate[word] ? translate[word] : word);
            word = word + ". ";
        } else {
            word = (translate[word] ? translate[word] : word);
            word = word + " ";
        }
        tweet = tweet + word;
    }
    //console.log(text);
    return tweet;
}

// Build arrays of adjectives
var negative_adjectives = ["uptight", "unglued", "zilch", "hacked", "freaked", "unhip"]
var neutral_adjectives = ["wild", "heavy", "unreal", "truckin'", "blitzed", "twitchin'"]
var positive_adjectives = ["rad", "gnarly", "groovy", "awesome", "hip", "nifty"]

// Run a tweet through NLP to enhance retro-ness!
// Run sentiment analysis then detect entities
var runNLP = function(text) {
    var params = {
      LanguageCode: "en",
      Text: text
    };

    var retText = text;

    comprehend.detectSentiment(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {
            var sentiment = data.Sentiment;
            // Detect Entities
            comprehend.detectEntities(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                } else {
                    data.Entities.forEach(function(entity) {
                        var type = entity.Type;
                        var keyword = entity.Text;
                        if (type === 'PERSON' || type === 'ORGANIZATION' || type === 'LOCATION' || type === 'EVENT') {
                            var index = getRandomInt(6);
                            var adj = '';
                            switch(sentiment) {
                                case "NEGATIVE":
                                    adj = negative_adjectives[index];
                                    break;
                                case "NEUTRAL":
                                    adj = neutral_adjectives[index];
                                    break;
                                case "POSITIVE":
                                    adj = positive_adjectives[index];
                                    break;
                            }
                            console.log(keyword);
                            console.log(adj + " " + keyword)
                            console.log(retText)
                            retText = retText.replace(keyword, adj + " " + keyword);
                            console.log("Here" + retText);
                        }
                    });
                    return retText;
                }
            });
        }
    });
    return retText;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
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
