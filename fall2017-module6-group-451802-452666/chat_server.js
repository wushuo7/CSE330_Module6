	// Require the functionality we need to use:
	var http = require('http'),
		socketio = require("socket.io"),
		fs = require('fs');
	// code source: https://classes.engineering.wustl.edu/cse330/index.php/Socket.IO
	// Make a simple fileserver for all of our static content.
	// Everything underneath <STATIC DIRECTORY NAME> will be served.
	var app = http.createServer(function(req, resp){
		// This callback runs when a new connection is made to our HTTP server.
		
		fs.readFile("login.html", function(err, data){
			// This callback runs when the client.html file has been read from the filesystem.
			
			if(err) return resp.writeHead(500);
			resp.writeHead(200);
			resp.end(data);
		});
	});
	app.listen(3456);
	
	var room_name_map = {};
	var rooms = ["main room"];
	var owners = {};
	var pswRoom = {};
	// code source: https://classes.engineering.wustl.edu/cse330/index.php/Socket.IO
	// Do the Socket.IO magic:
	var io = socketio.listen(app);
	io.sockets.on("connection", function(socket){
		// This callback runs when a new Socket.IO connection is established.
		
		socket.on('message_to_server', function(data) {
			// This callback runs when the server receives a new message from the client.
			var passing = data.message;
			console.log("message: "+passing ); 
			io.sockets.emit("message_to_client",{message: passing , username:data.username}); 
		});
		
		socket.on('new_user', function(data) {
			//put the user to the main room
			socket.username  = data.username;
			socket.room = 'main room';
			room_name_map[data.username] = socket.room;
			socket.join('main room');
			pswRoom['main room']="";
			console.log("new user :" + data.username +" just entered the room");
			io.sockets.emit('AddnewRoom', {pswRoom:rooms});
			io.sockets.emit('renewRoom', {name:data.username});
			io.sockets.in(socket.room).emit('showUsers', {room_now:socket.room, allusers :room_name_map });
		});
		
		socket.on('message_to_private', function(data) {
			// This callback runs when the server receives a new message from the client.
			var private_receiver = data.receiver;
			var private_message = data.message;
			var private_sender = data.sender;
			//make sure they are in the same room
			if(room_name_map[private_receiver] !== room_name_map[private_sender]){
				io.sockets.emit("private_message_error",{sender:private_sender});
			}
			else{
				console.log("message: "+private_message); 
				io.sockets.emit("private_message",{message: private_message , sender:private_sender, receiver: private_receiver});
			}
		});
		
		socket.on('build_a_room', function(data) {
			// This callback runs when the server receives a chat room
			var roomname = data.new_room_name;
			var password = data.new_room_password;
			var owner = data.owner;
			rooms.push(roomname);
			pswRoom[roomname]=password;
			owners[roomname]=owner;
			console.log("new room created: "+roomname); 
			io.sockets.emit("AddnewRoom",{pswRoom: rooms});
		});
		
		socket.on('enter_a_room', function(data) {
			// This callback runs when the server receives a user request enter a chat room
			var roomname = data.enter_room_name;
			var privous = socket.room;
			
			socket.leave(socket.room);
			socket.room = roomname;
            socket.join(roomname);
            console.log(socket.room);
            room_name_map[socket.username] = roomname;
			io.sockets.emit('renewRoom', {name:socket.username});
			io.sockets.in(socket.room).emit('showUsers', {room_now:socket.room, allusers :room_name_map });
			io.sockets.in(privous).emit('showUsers', {room_now:privous, allusers :room_name_map });
			
		});
		
		socket.on('findPassword', function(data) {
			// This callback runs when check the password
			var roomname = data.enter_room_name;
			var password = pswRoom[roomname];
			socket.emit("enter_chat_room", {roomname:roomname,password:password});
		});
		
		
		socket.on('kick_someone', function(data) {
			//kick some one out of this room
			var exector = data.executor;
			var username_kick = data.username_kick;
			var roomname_1 = room_name_map[username_kick];
			if(exector == owners[roomname_1]){
				io.sockets.in(roomname_1).emit('kick_user', {kick_user:username_kick});
				room_name_map[username_kick] = 'main room';
			}
			else{
				io.sockets.emit("kick_out_error",{sender:roomname_1});
			}
		});
		
		socket.on('ban_someone', function(data) {
			//ban some one 
			var exector = data.executor;
			var username_ban = data.username_ban;
			var roomname_1 = room_name_map[username_ban];
			if(exector == owners[roomname_1]){
				io.sockets.in(roomname_1).emit('ban_user', {ban_user:username_ban,ban_room:roomname_1});
				room_name_map[username_ban] = 'main room';
			}
			else{
				io.sockets.emit("ban_error",{sender:roomname_1});
			}
		});
		
		socket.on('authorize_someone', function(data) {
			var exector = data.executor;
			var username_authorize = data.username_authorize;
			var roomname_1 = room_name_map[username_authorize];
			if(exector == owners[roomname_1]){
				owners[roomname_1] = username_authorize;
				io.sockets.in(roomname_1).emit('authorize_user', {authorize_user:username_authorize,authorize_room:roomname_1});
			}
			else{
				io.sockets.emit("authorize_error",{sender:roomname_1});
			}
		});
		
		socket.on('change_password', function(data) {
			var password_change = data.password_change;
			var room_change = data.room_change;
			var username1 = data.user;
			if(username1 == owners[room_change]){
				pswRoom[room_change] = password_change;
				io.sockets.in(room_change).emit('change_password', {owner:username1,room:room_change});
			}
			else{
				io.sockets.emit("change_password_error",{sender:username1});
			}
		});
		
		
	});
	
	
	
	