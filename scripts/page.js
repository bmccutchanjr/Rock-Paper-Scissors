// A on-line multi-player implementation of Rock/Paper/Scissors.  This script assumes no more than two
// players to a game.  And unfortunately, it can't support multiple games

// I originally intended to allow multiple games, but ran into an issue with the integrity of the
// database.  I had the first player connecting to the database (call it Player One) create a database
// reference for a new game (call that Game ID).  A second player connecting (call that one Player
// Two) would serch all of the Game ID reference points for one with just a single player.  When either
// drops out of a game, the remaining player would re-initialize Game ID (essentially removing the node
// for the dropped player) and wait for the next browser to connect to the database.
//
// The problem happens when the last person connected to any one game drops out.  The database reference
// for that game remains creating a situation where a new player would attempt to connect to a game that
// no one else is playing even when there may be players waiting for an opponent.  I tried to remove the
// reference point to the game when the last player drops out, but that doesn't seem possible.  Support
// for window.unload() (and all of it jQuery or HTML variants, including "beforeunload") is not consistant
// across browsers (Google Chrome appears to not support it at all).  That event may even fire at
// inappropriate moments, like when a player opens another tab or switches to another app for a few moments.
//
// I'm thinking that multiple games are still possible, but would require some sort of handshaking up
// front.  I would need a list of games or players waithing for an opponent.  When Player Two connects to
// the database they would select the first such Handshaking reference point and set some predefined value
// to a special purpose node.  If there is a Player One also connected to that node their browser would fire
// an event and the BROWSER would AUTOMATICALLY respond, no user interaction required.  Now both browsers
// know they are connected to a Handshakiing reference with two active players and the game can continue
// normally.  If Player Two does not receive such a responce in a specified amount of time(since this
// handshaking is handled automatically by the browsers it would be a short interval, probably not more than
// one or two seconds), Player Two's browser would perform a clean-up operation to remove the assumed
// unused Handshaking reference point.
//
// This process continues until the handshaking is completed successfully, at which time the refence point
// used for this handshake is removed.  It would add some lag time to joining into a game, but not much.
// Presumably, the number of inactive handshaking reference points would be kept minimal as Player Two cleans
// up the database.
//
// There's still a very small window of opportunity for a Player Three or Player Four to attempt to join
// the same game before the handshaking is complete.  That would have to be handled to keep Player Three
// from performing some inappropriate behavior.
//
// I don't think there's enough time left to implement this handshaking, so this will be limited to two
// active players.  Any additional browsers connecting to the database will receive a message indicating
// they can't play.

var PlayerOne = {};
var PlayerTwo = {};
var iAmPlayerOne = false;
var messages = [];          // an array of messages, whether generated by the script or sent between
                            // the players
var numPlayers = 0;
var gameActive = false;

// I was going to put messages[] on Firebase but it seems overly complicated, just pass the most recent
// message between players and concatenate the array in the script.  Much simpler, much cleaner.  It means
// the players won't see exactly the same messages...but the differences will be messages generated by
// the script specific to the players.  So that's okay. 

// audio files
var buzz = new Audio ("audio/buzz.mp3");
var loser = new Audio ("audio/wah-wah.mp3");
var tada = new Audio ("audio/ta-da.mp3");

function pushMessage(message)
{   // concatenates messages[] for history and show the last two messages on the page

    messages.push(message);

    mLength = messages.length;

    var mDiv = $(".messages");
    mDiv.empty();

    for (var i=0; i<2; i++)
    {   var pTag = $("<p>");
        pTag
            .text(messages[mLength - (i + 1)]);

        mDiv
            .prepend(pTag);
    }
}

function setMessage(database, message)
{   // database.set() messages to Firebase

    database.ref("/Message").set(
    {   Message: message
    })
}

function setName(database, pNumber, pName)
{   // Uses database.set() to update the database reference point with the players name.  Choice is
    // assigned an empty string because they haven't had a chance to select it yet

    if ((pNumber === "PlayerOne") || (pNumber === "PlayerTwo"))
    {   database.ref("/" + pNumber).set(
        {   Name: pName,
            Choice: ""
        })
    }
    else
    {   displaySystemMessage ("something very strange happened\n\nsetname(" + pNumber, ", " + pName + ")");
    }
}

var connected = false;

function isConnected()
{   // A simple function to test if the page has previously loaded and connected to Firebase.  Prevents
    // some actions from occuring each time a player makes a Rock/Paper/Scissors choice

// 03     if (whichPlayer() && PlayerOne)
// 03     {   // If this is player one and a PlayerOne object exists, the page has previously mades its
// 03         // connection to Firebase and the game has been initialized
// 03     
// 03         return true;
// 03     }
// 03 
// 03     if (whichPlayer() && PlayerTwo)
// 03     {   // If this is player two and a PlayerTwo object exists, the page has previously mades its
// 03         // connection to Firebase and the game has been initialized
// 03    
// 03         return true;
// 03     }
// 03 
// 03     // Otherwise return false
// 03     return false;
    return connected;
}

function joinGame(database)
{   // Join a game already in progress

console.log("joinGame()");

    // Create a database node for player two
    setName(database, whichPlayer (), "");

    // And let the other player know an opponent is connecting
    database.ref("/Message").set(
    {   Message:
        {   Message: "A new player is connecting"
        }
    });

    return true;
}

function initializeGame(database)
{   // Initialize a game

    // if the script is initializing the game, this is playerOne

    iAmPlayerOne = true;

    // And now create a node in Firebase for Player One

    setName(database, whichPlayer (), "");

    database.ref("/PlayerTwo").remove();

    database.ref("/Message").remove();

    // And initialize the objects representing the players

    PlayerOne = {};
    PlayerTwo = {};

    return true;
}

function whichPlayer()
{   // simply returns the string "playerOne" or "playerTwo" depending on the value of iAmPlayerOne

    if (iAmPlayerOne) return "PlayerOne";

    return "PlayerTwo";
}

function playAudio(sound)
{   // play audio

    // this is pretty simple and may seem odd to make it a function, but audio files do not always play
    // properly if they are not explicitly loaded before playing.  So this function just makes sure it
    // happens every time.

//     try
//     {   // It is an error to to play an audio file before the user interacts with the page.  Why that
//         // would be I don't know.  It is not a fatal error (the script continues to execute)
//         // but still.  SO I'm wrapping it in a try/catch block that does nothing...because nothing needs
//         // to be done.
        
        sound.load();
        sound.play();
//     }
//     catch (e)
//     {   // I don't want to do anything with this error
//     }
// Then again, this try-block doesn't catch the error any way.
}

function fadeIt(element)
{   // use jQuery to animate the opacity of the error message message after displayed for 5 seconds
    // once the error message of fully transparent, remove it from the DOM.

    if (!element)
    {   $(".msg-div").animate({opacity: 0.0}, 5000, function()
        {
            $(".msg-wrapper").remove(); 
        });
    }
    else
    if (element === "#instructions")
    {   setTimeout (function()
        {   $(element).animate({opacity: 0.0}, 5000, function()
            {   $(element).remove();
            })
        }, 5000, element);

        $("header").animate({fontSize: 24, padding: 10}, 2000);
    }
}

function displaySystemMessage(error)
{   // display an error message on the screen and set a timer to remove the message after it has been
    // displayed for 5 seconds

    playAudio (buzz);

    var heading = $("<div>");

    heading
        .addClass ("msg-heading")
        .text ("ERROR!");
    
    var message = $("<div>");

    message
        .addClass ("msg-message")
        .text (error);
        
    var errorDiv = $("<div>");

    errorDiv
        .addClass ("msg-div fatal-theme")
        .append(heading)
        .append(message);
    
    var wrapper = $("<div>");
    wrapper
        .addClass("msg-wrapper")
        .append(errorDiv);

    $("body").append (wrapper);

    setTimeout (fadeIt, 5000);
}

function numberOfPlayers ()
{   // How many players are already connected to the game

    var number = 0;
    if (PlayerOne.Name) ++number;
    if (PlayerTwo.Name) ++number;

    return number;
}

function isGameActive ()
{   //


//     if (!gameActive)
    {   // If the game is not active (if I don't have two players) check to see if it should be.
console.log("isGameActive()");
console.log("PlayerOne: ", PlayerOne);
console.log("PlayerTwo: ", PlayerTwo);
        if (PlayerOne.Name && PlayerTwo.Name)
        {   // PlayerTwo is not created when the game is initialized, but when PlayerTwo connects to
            // the database.  So if neither PlayerOne nor PlayerTwo is undefined, I have two active
            // players.
            //
            // This code should only execute once, when PlayerTwo connects to the database
    
//             gameActive = true;
            return true;
        }
    }

//     if (gameActive)
//     {   // If the we have an active game (two players are connected the the database)
//     
//         // Either of the players can disconnect from the database at any time.  So first check for that
// 
//         if (numPlayers != 2)
//         {   // This isn't actually correct, nor is it as simple as it seems.  numPlayers is simply the
//             // number of browsers connected to the database as set by .ref("info/Connected").  A third
//             // browser can connect to the Firebase database and bump numPlayers to 3.  It will stay at
//             // 3 as long as they are connected to the database.  If any of the three browsers disconnect,
//             // numPlayers becomes 2, which would seem to be a valid number.  But is could represent one
//             // player and one 'lurker'.  (Again, there seems no way for a browser to clean up after itself
//             // when it disconnects from the database.)  I know of nothing in Firebase that would identify
//             // which browser disconnected.  A simply test of any variable in this script won't tell me if
//             // I have a valid game.
//             //
//             // Some kind of handshaking is required here.  That is also too involved for this application,
//             // so I will assume a third browser never connects to the database.
// 
//             gameActive = false;
// 
//             // If I had that handshaking in place, the remaining player would reinitialize the game at
//             // this point (esentially removing the reference point for the opposing player)
//         }
//     }
console.log("gameActive: ", gameActive);
    return gameActive;
}

function doRPS ()
{   // Put the Rock / Paper / Scissors icons on the screen
// console.log("doRPS()");
// //     $("rps-div").remove();
// //     var game = $("#game");
//     var game = $("<div>");
//
// //     var image = $("<img> src=\"images/SPR-scissors.png\"");
//     var image = $("<img>");
//     image
//         .addClass ("rps")
//         .attr("choice", "rock")
//         .attr("src", "images/SPR-rock.png")
//         .css("height", "auto")
//         .css("width", "150px");
// console.log("doRPS()");
//  
//     game
//         .append(image);
//
//     image = $("<img>");
//     image
//         .addClass ("rps")
//         .attr("choice", "paper")
//         .attr("src", "images/SPR-paper.png")
//         .css("height", "auto")
//         .css("width", "150px");
//        
//     game
//         .append(image);
//
//     image = $("<img>");
//     image
//         .addClass ("rps")
//         .attr("choice", "rock")
//         .attr("src", "images/SPR-scissors.png")
//         .css("height", "auto")
//         .css("width", "150px");
//
//     game
//         .append(image);
//
//     $("#game").append(game);
}

$(document).ready(function()
{   
    $("#game")
    .on("click", "#message-button", function()
    {   // The event handler for the message button.

        event.preventDefault();

        // Get text from the message input field and set it to the database, not to the screen.
        // Messages between players will be added to the screen by the database event handler.
        
        var msg = $("#message-input").val().trim();

        if (msg)
        {   // Don't do anything if no text was entered.
        
            setMessage (database, msg);

            // Clear the input

            $("#message-input").val("");
        }
    })
    .on("click", "#name-button", function(event)
    {   // The event handler for #name-button

        event.preventDefault();

        var tName = $("#name-input").val().trim();

        if (tName)
        {   // Only update the database if the user entered a name
        
            // First, get that name on the page.  This much is the same for both players, but I 
            // want to add a second message if this is the first player.  So makes sence to do this
            // before doing anything player specific.

            $("#your-name").text(tName);

            $("#name-form").css("display", "none");

            pushMessage ("You will be known as " + tName);

            // Now the player specific stuff...it's pretty much the same thing either way

            if (iAmPlayerOne)
            {   playerOneName = tName;

                setName (database, "PlayerOne", tName);

                pushMessage ("Waiting for player two");

                if (PlayerTwo.Name)
                {   setMessage (database, PlayerOne.Name + " challenges " + PlayerTwo.Name)
                }
            }
            else
            {   playerTwoName = tName;

                setName (database, "PlayerTwo", tName);

                if (PlayerOne.Name)
                {   setMessage (database, PlayerTwo.Name + " challenges " + PlayerOne.Name)
                }
            }

            // and hide the name input form
            $("name-form").css("display", "none");
        }
    })
    .on("click", ".rps-link", function(event)
    {   // generic event handler for the rock / paper / scissors images

        event.preventDefault ();

        alert ($(this).attr("value"));
    })

    //
    // Firebase specific code: connecting to Firebase and event listeners
    //

    // Initialize Firebase

    var config =
    {   apiKey: "AIzaSyD1e2P0WVFVjRCewvFURl2lTpR26BwfG7c",
        authDomain: "rock-paper-scissors-2e60c.firebaseapp.com",
        databaseURL: "https://rock-paper-scissors-2e60c.firebaseio.com",
        projectId: "rock-paper-scissors-2e60c",
        storageBucket: "",
        messagingSenderId: "429649976880"
    };

    firebase.initializeApp(config);
    var database = firebase.database();

    var connectionsRef = database.ref("/connections");
    var connectedRef = database.ref(".info/connected");
  
    var counterDiv = $("#player-count");

    database.ref("PlayerOne").on("value", function(snap)
    {   // The event listener for the database reference "/PlayerOne"

        // PlayerOne has the data specific to Player One.  At this time that is just a name and
        // their Rock/Paper/Scissor choice

        if (snap.val())
        {   // If the snap shot has a value.  It should...

            PlayerOne = snap.val();

            if (isGameActive())
            {   // only do this if both player1 and player2 have connected
            
                var nameDiv = $("#your-name");
                var pTag = $("<p>");
                pTag.html("<b>" + PlayerOne.Name + "</b> vs. <b>" + PlayerTwo.Name + "</b>");
                nameDiv.append(pTag);

                // If we have an active game, we need a way to interact with it.

                doRPS ();
            }
        }
    });

    database.ref("PlayerTwo").on("value", function(snap)
    {   // The event listener for the for the database reference "/PlayerTwo"

        // PlayerTwo has the data specific to Player Two.  At this time that is just a name and
        // their Rock/Paper/Scissor choice

        if (snap.val())
        {   
            PlayerTwo = snap.val();

            if (isGameActive())
            {   // only do this if both player1 and player2 have connected
            
                var nameDiv = $("#your-name");
                var pTag = $("<p>");
                pTag.html("<b>" + PlayerOne.Name + "</b> vs. <b>" + PlayerTwo.Name + "</b>");
                nameDiv.append(pTag);

                // If we have an active game, we need a way to interact with it.

                doRPS ();
            }
        }
    });

    database.ref("Message").on("value", function(snap)
    {   // The event listener for the for the database reference "/Message"
console.log("Message.on()");
console.log(database);
        // Ignore these events if there are more than two players

        if (numberOfPlayers() > 2) return;

        // These are the messages players send to each other.  Messages generated by the script don't
        // don't need to be shared.

console.log("Message.on()");
        if (snap.val())
        {   
console.log(snap.val());
            pushMessage (snap.val().Message);

        }
    });

    connectedRef.on("value", function(snap)
    {   // manage connections

        if (snap.val())
        {   // Add user to the connections list.
            var con = connectionsRef.push(true);

            // Remove user from the connection list when they disconnect.
            con.onDisconnect().remove();
        }
    });
  
    connectionsRef.on("value", function(snap)
    {   // When first loaded or when the connections list changes.

        var numPlayers = snap.numChildren();

//         if (numPlayers > 1)
//             $("#player-count").text("There is " + numPlayers + " person connected to the database.");
//         else
//             $("#player-count").text("There are " + numPlayers + " people connected to the database.");
        if (numPlayers === 1)
            pushMessage ("There is " + numPlayers + " person connected to the database.");
        else
            pushMessage ("There are " + numPlayers + " people connected to the database.");

console.log("connectionsRef.on()");
console.log("number: ", numPlayers);

        // It's kinda neat to know how many people are connected and playing the game at any given
        // time.  But, I don't want to do anything else after the page is loaded and the player has
        // joined a game.

        if (!isConnected())
        {   // This code should only be done when a browser first connects to the database.

            if ((numPlayers > 0) && (numPlayers < 3))
            {   // And this code should only be done for the forst or second player to connect to
                // the database...

                // First, hide the instructions.  The instructions are displayed by default so that no
                // one after the first or second player will see page elements that they can interact
                // with, but do nothing.  If the players want to see the instructions, they can click
                // on the SHOW INSTRUCTIONS button
                
//                 $("#instructions").css("display", "none");
                fadeIt ("#instructions");
                $("#button-div").css("display", "block");

                // Now that valid players are connected, I want those hidden elements visible

//                 $("#game").css("display", "block");

                if (numPlayers === 1)
                {   // This is the first player to connect, initialize the contest.

                    connected = initializeGame (database);
                }
                else
                {   // This is the second player to connect, join in the contest

                    connected = joinGame(database);
                }
            }
            else
            {   // More than two connections.  This game is hot!
            
                // But sorry, it's just a 2-player game
                
                $(".close-button").remove();
                displaySystemMessage ("You are connection #" + numPlayers + ". Sorry, the game only works for two players.");
            }
        }
    });
});
