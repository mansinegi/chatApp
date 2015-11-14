var express = require('express');
var app = express();
var mongoose = require('mongoose');
app.use(express.static(__dirname + '/public'));
var port = Number(process.env.PORT || 3000);
var io=require('socket.io').listen(app.listen(port));

var users={};

var mongUrl = process.env.MONGOLAB_URI || 'mongodb://localhost/chat' ;

mongoose.connect(mongUrl,function(err){
	if(err){
		console.log(err);
	}
	else{
		console.log("Connected");
	}
});

var chatSchema = mongoose.Schema({
	name : String,
	msg : String,
	created : { type : Date, default : Date.now}
});

var chatModel = mongoose.model('ChatMessage', chatSchema);

io.on("connection", function(socket){
	var query = chatModel.find({});
	
	query.sort('-created').limit(8).exec(function(err,docs){
		if(err){
			throw err;
		}
		else{
			//console.log("sending old messages");
			socket.emit("load old msgs", docs);
		}
	});
	
	
	socket.on("new user", function(data, callback){
		if(data in users){
			callback(false);
		}
		else
		{
			callback(true);
			socket.userName = data;
			users[socket.userName]=socket;
			io.emit("user names", Object.keys(users));
		}

	});

	socket.on("disconnect", function(data){
			if(!socket.userName){
				return;

			}
			else{
				delete users[socket.userName];
				io.emit("user names", Object.keys(users));
			}
	});

	socket.on("send message", function(data){
		var newMsg = new chatModel({name : socket.userName , msg : data });
		newMsg.save(function(err){
			if(err){
				throw err;
			}
			else{
				io.emit("new message", {msg :data , sender : socket.userName});

			}
		}) 

	});

	socket.on("private", function(data){
		//console.log("whisper");
		if(data.receiver in users){
			users[data.receiver].emit("new private message", {sender : data.sender, receiver : data.receiver, msg : data.msg});
				
		}
		
	});


});


// };