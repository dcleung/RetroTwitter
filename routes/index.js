var express = require('express');
var router = express.Router();
var Twitter = require('twitter');
var credentials = require('./config.json');
var AWS = require('aws-sdk');

var request = require('request');

var translate = {
    "children" : "ankle biters",
    "awesome" : "bad",
    "sore throat" : "bad pipes",
    "steal" : "bag",
    "stole" : "bagged",
    "study" : "bag some food for the brain",
    "tricked" : "bearded",
    "leave" : "beat it",
    "grouchy" : "bent",
    "knife" : "blade",
    "event" : "blast",
    "drunk" : "blitzed",
    "body" : "bod",
    "hurt" : "bogart",
    "injured" : "bogart",
    "failure" : "bomb",
    "fantastic" : "bookin'",
    "record player" : "box",
    "money" : "bread",
    "white socks" : "brights",
    "brew" : "beer",
    "to annoy" : "to bug",
    "annoy" : "bug",
    "annoyed" : "bugged",
    "depressed" : "bummed out",
    "fired" : "bumped",
    "dismissed" : "bumped",
    "cheated" : "burned",
    "school lecture" : "chalk talk",
    "lecture" : "chalk talk",
    "ignore" : "chill",
    "teeth" : "chops",
    "roast" : "chop",
    "tired" : "clanked",
    "explain" : "clue you in",
    "awkward person" : "clutz",
    "jail" : "college",
    "intoxicated" : "crocked",
    "inebriated" : "crocked",
    "to joke" : "cut up",
    "Do you understand" : "Dig",
    "idiot" : "ditz",
    "peace lover" : "dove",
    "nonconformist" : "dropout",
    "rebel" : "dropout",
    "geek" : "dude",
    "boring" : "dullsville",
    "roasted" : "ate dirt",
    "attractive" : "fab",
    "hot" : "fox",
    "tattletale" : "fink",
    "quit" : "fink out",
    "talkative" : "flap jaw",
    "movie" : "flick",
    "movies" : "flicks",
    "lose control" : "freak out",
    "excellent" : "funky",
    "police" : "fuzz",
    "the best" : "gasser",
    "handshake" : "gimme some skin",
    "obstacle" : "glitch",
    "cool" : "groovy",
    "nice" : "groovy",
    "money" : "green",
    "disgusting" : "grody",
    "a record" : "groove",
    "records" : "grooves",
    "record store" : "groove yard",
    "neat" : "groovy",
    "dirty" : "grungy",
    "shabby" : "grungy",
    "mad" : "hacked",
    "problem" : "hang-up",
    "Cadillac" : "hog",
    "persuade" : "hustle",
    "party" : "jam",
    "excited" : "keyed",
    "dismiss" : "kiss off",
    "hobby" : "kicks",
    "passtime" : "kicks",
    "school" : "konk class",
    "relaxed" : "laid back",
    "pathetic" : "lame",
    "sunbathe" : "lay out",
    "freeloader" : "leaner",
    "intoxicated" : "loaded",
    "language" : "lingo",
    "wrinkles" : "mileage",
    "fine" : "mint",
    "radio" : "music machine",
    "jukebox" : "music machine",
    "usefule" : "nifty",
    "truth" : "nitty-gritty",
    "now" : "fashionable",
    "strange" : "off the wall",
    "mom" : "old lady",
    "mother" : "old lady",
    "dad" : "old man",
    "father" : "old man",
    "crazy" : "out of his tree",
    "unemployed" : "on the turf",
    "responsible" : "on the hook",
    "bed" : "pad",
    "cheerleader" : "paper shaker",
    "cop" : "pig",
    "glasses" : "peppers",
    "news" : "poop",
    "sleep" : "rack",
    "slept" : "racked",
    "talk" : "rap",
    "talked" : "rapped",
    "clothes" : "rags",
    "parents" : "rents",
    "theft" : "rip off",
    "fight" : "rumble", 
    "spectacular" : "rockin' out",
    "rejected" : "shot down",
    "phony" : "shuck",
    "fake" : "shuck",
    "girl" : "skirt",
    "sunglasses" : "shades",
    "music" : "sounds",
    "conceited" : "stuck up",
    "loser" : "square",
    "calm" : "stay lose",
    "worry" : "sweat",
    "teacher"  : "teach",
    "friendly" : "tight",
    "hitchhike" : "thumb",
    "hurt" : "torn up",
    "destroy" : "trash",
    "never" : "Tuesday",
    "songs" : "tunes",
    "distraught" : "unglued",
    "outstanding" : "unreal",
    "nervous" : "uptight",
    "open" : "upfront",
    "cigarettes" : "weeds",
    "car" : "wheels",
    "pizza" : "za",
    "zero" : "zilch",
    "pimple" : "zit"
}

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
