# RetroTwitter

Bring your tweets back to a more rad time!

## Inspiration

We were inspired by the retro theme (especially all the music)!  We thought it'd be fun to imagine what social media would be like back in the 1960's, so we created RetroTwitter -- which emulates what someone's timeline may have looked in a more rad era.

## What it does

It takes a Twitter handle and brings up the profile picture as well as recent tweets.  The twist is that these items are retro-fied! Profile picture will have a color afro while the tweets will use slang from the 60's.

## How we built it

First, we obtained data using Twitter API.  Then we had 2 major components to consider: the profile picture altering and the tweet "translation."  We used Amazon Rekognition to identify certain key points in a profile picture (specifically locations of the eyes).  Through rigorous testing, we modeled the location of the afro in multiple pictures to create a regression model that accurately super-imposed the afro based on the eyes' coordinates from Rekognition.

Retro-fying tweets was a two-step process.  We first had a dictionary that simply swapped out current words with their 1960 equivalent.  The second part was a lot of NLP.  We ran sentiment analysis (powered by Amazon Comprehend) that obtained a sentiment score.  Then we found keywords that were modified (via replacement or adjectives) based on the sentiment to give a flavor of how things were described in the 1960's.

Finally, we threw together some HTML, CSS, Javascript to create our web-app.

## Challenges we ran into

Callbacks... Because we had quite a few API calls to Twitter/Amazon as well as writing messy code, keeping tracks of callbacks was no easy task.

Super-imposing the afro.  Amazon Rekognition, although powerful, only gave us the information to the eyes' location.  At first, we tried to study anatomy, distances/ratios of eyes, and other human face qualities to come up with where to place the afro.  This turned out to be surprisingly hard because there wasn't a clear relationship.  We came up with an idea to hardcode the afro onto test subjects and then do a regression model to pinpoint where the afro went.  With enough data, our algorithm worked pretty well.

## Accomplishments that we're proud of

* We're very proud of the algorithm to place the afro and how accurate it is.
* We're proud to successfully use some of Amazon's more powerful APIs.
* We're proud we got a decent amount of sleep (for a hackathon at least) :)

## What I learned

* How to use Twitter API to look up timelines.
* How to do super-imposition of pictures server-side.
* Sentiment-analysis and how to use it for better predictions.
* To NOT commit API keys.

## What's next for RetroTwitter

* Adding different hairstyles so that there would be more variety.
* Super-imposing afros onto tweeted pictures and maybe videos too.
* A larger dictionary and a deep-learning model for NLP.
* Less plain of a UI.

## Usage
```
npm install

npm start
```

Server should be running on `localhost:3000`
