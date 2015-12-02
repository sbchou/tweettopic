// Set up a collection to contain tweet information. On the server,
// it is backed by a MongoDB collection titled "tweets".

Tweets = new Mongo.Collection("tweets");
Labels = new Mongo.Collection("labels");



if (Meteor.isClient) { 
  var width = $(window).width() - 25; 
  $("#outer").width(width);


  Meteor.subscribe('theTweets');
  Meteor.subscribe('theLabels');

  globalHotkeys = new Hotkeys();

  // LEFT KEY MEANS NO NO MEANS NO
  globalHotkeys.add({
    combo : "left",
    callback : function () {
      $('.no').css("background-color", "#4099FF");
      $('.no').css("color", "#fff");
      setTimeout( function (){  
        $('.no').trigger('click'); 
      }, 200);
    }
  })

  globalHotkeys.add({
    combo : "right",
    callback : function () {
      $('.yes').css("background-color", "#4099FF");
      $('.yes').css("color", "#fff");
      setTimeout( function (){  
        $('.yes').trigger('click'); 
      }, 200);
    }
  })

  Template.leaderboard.helpers({

    tweets: function () {
      var currentUserId = Meteor.userId(); 
      // objects we haven't labeled yet. does this work?
      //IF NO MORE LEFT
      p = Tweets.findOne({'body':{$ne:''}, 'user_ids':{$ne:currentUserId}});
      if(typeof p === 'undefined'){
        console.log('NO MORE ARTICLES');
        allDone = true;
        return [];
      }
      else{      
        Session.set("selectedArticle", p._id);   
        return [ p ];
      }
    },

    isAdmin: function(){
      return (Meteor.user().profile['name'] === 'Sophie Chou');
    },
 
    noEntries: function () {
     return (Tweets.find().count() === 0);
    },

    allDone: function (){
    return Tweets.find({'user_ids':{$ne : Meteor.userId()}, body:{$ne:''}}).count() === 0;
    },

    selectedArticle: function () {
      var tweet = Tweets.findOne(Session.get("selectedArticle"));
 
      return tweet && tweet.title;
    },
    completeCount: function (){
      return Tweets.find({'user_ids': Meteor.userId()}).count()
    },
    percent_complete: function(){
      var completed = Tweets.find({'user_ids': Meteor.userId()}).count();
      var total = Tweets.find({'body':{$ne:''}}).count();
      return Math.round(( completed / total ) * 100);
    },

    numTrue: function(){
      return Labels.find({'user_id':Meteor.userId(), user_label : 1}).count();
    },
    numFalse: function(){
      return Labels.find({'user_id':Meteor.userId(), user_label : 0}).count();
    },

    //results for user!
    // show last 10
    // demo week where round = 10
    results: function(){ 

      //var labels = Labels.find({'user_id': Meteor.userId()}, 
      //  {$sort: { timestamp: -1 }, skip:0, limit: 10}); 
      var labels = Labels.find({'user_id': Meteor.userId()}); 
      return labels;
    },

    //machine confidences
    //show last 10
    // demo week where round = 10
    machineResults: function(){  
      //var values = Labels.find({'user_id': Meteor.userId()}, {fields : {'tweet_conf':1}}, {$sort: { timestamp: -1 }, skip:0, limit: 10}).map(function(x) { return x.tweet_conf;});
      var values = Labels.find({'user_id': Meteor.userId()}, {fields : {'tweet_conf':1}}).map(function(x) { return x.tweet_conf;});
 
      // can't do list comprehensions
      var bools = []
      // map function still returns all, so i cut it here
      for (var i = 0; i < values.length; i++) {
           bools.push(values[i] > 50);
      } 
      return bools;
    }



  

  });


  Template.leaderboard.events({
    // for the file uploader
    "change #files": function (e) {
      var files = e.target.files || e.dataTransfer.files;
      for (var i = 0, file; file = files[i]; i++) {
        if (file.type.indexOf("text") == 0) {
          var reader = new FileReader();
          reader.onloadend = function (e) {
            var text = e.target.result;  
            var all = $.csv.toObjects(text);  
            _.each(all, function (entry) {
              /*
              entry.label_ids = []; // add labels array
              entry.user_ids = [];
              entry.confidence = Math.floor(parseFloat(entry.election_confidence) * 100);
              //entry.people = JSON.parse(entry.people);
              entry.people = JSON.parse(entry.people.replace(/u'/g, "'").replace(/'/g, "\""));
              entry.orgs = JSON.parse(entry.orgs.replace(/u'/g, "'").replace(/'/g, "\""));

              var body = entry.body.trim();
              var people = entry.people; 
              for (i = 0; i < people.length; i++){
                var names = people[i].split(" ");
                for (j = 0; j < names.length; j++){
                  var re = new RegExp(names[j],"g");
                  body = body.replace(re, '<b><font color="blue">'+ names[j] +'</font></b>');
                }
              }  

              var orgs = entry.orgs; 
              for (i = 0; i < orgs.length; i++){  
                var re = new RegExp(orgs[i], "g");
                body = body.replace(re, '<b><font color="green">' + orgs[i] + '</font></b>'); 
              }  
              entry.body = body; 
              */
               
              Tweets.insert(entry);

            });
          }
          reader.readAsText(file);
        }
      }
    },

    'click .yes': function () {

      id = Date.now().toString().substr(4);
      tweet_title = Tweets.find( {_id:Session.get("selectedArticle")}).map(function(x) { return x.title;});
      tweet_conf = Tweets.find( {_id:Session.get("selectedArticle")}, {fields: {'confidence': 1}}).map(function(x) {return x.confidence;}); 
 
      Labels.insert({
        _id : id,
        tweet_id : Session.get("selectedArticle"),
        tweet_title: tweet_title[0],
        tweet_conf: tweet_conf[0],
        user_id : Meteor.userId(),
        timestamp : Date.now(),
        user_label: 1

      }); 

      //add this user and this label to the tweet
      Tweets.update(Session.get("selectedArticle"),
       {$push: {'label_ids': id, 'user_ids': Meteor.userId()}
      });

      $("#leaderboard").load(location.href + " #leaderboard");
    },
 

    'click .no': function () {

      id = Date.now().toString().substr(4);

      tweet_title = Tweets.find( {_id:Session.get("selectedArticle")}).map(function(x) { return x.title;});

      console.log(tweet_title);

      tweet_conf = Tweets.find( {_id:Session.get("selectedArticle")}, {fields: {'confidence': 1}}).map(function(x) {return x.confidence;});

      console.log(tweet_conf);
      
 
      Labels.insert({
        _id : id,
        tweet_id : Session.get("selectedArticle"),
        tweet_title: tweet_title[0],
        tweet_conf: tweet_conf[0],
        user_id : Meteor.userId(),
        timestamp : Date.now(),
        user_label: 0

      }); 

      //add this user and this label to the tweet
      Tweets.update(Session.get("selectedArticle"),
       {$push: {'label_ids': id, 'user_ids': Meteor.userId()}
      });

      $("#leaderboard").load(location.href + " #leaderboard");
    }
  });

  Template.tweet.helpers({
    selected: function () {
      return Session.equals("selectedArticle", this._id) ? "selected" : '';
    }
  });  
   
 }

 

// On server startup, create some tweets if the database is empty
if (Meteor.isServer) {

    Meteor.publish('theTweets', function(){
      var currentUserId = this.userId;
      return Tweets.find({});
    });

    Meteor.publish('theLabels', function(){
      var currentUserId = this.userId;
      return Labels.find({});
    });
}
