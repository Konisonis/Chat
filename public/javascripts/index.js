$(() => {
    let socket = io();

    let uploader = new SocketIOFileClient(socket);

    let homeChat = [];
    let userList = {};

    let privateChatUser;


    //Log in with user name
    $('#loginForm').submit(() => {
            socket.emit('login', $('#user').val(), (ok) => {
                if (ok) {
                    $('#chat').show();
                    $('#modal').modal('toggle');
                    $('#loginModal').hide();
                    $('#yourName').text($('#user').val());
                } else {
                    $('#user').val('');
                    $('.alert').show();
                }
            });
            return false;
        }
    );

    //send a chat message
    $('#chatForm').submit(() => {
        //private chat
        if (privateChatUser) {
            socket.emit('private message', $('#m').val(), privateChatUser);
        } else {
            socket.emit('chat message', $('#m').val());
        }
        $('#m').val('');
        return false;
    });

    //Start file upload
    $('#inputFile').change(() => {
        var fileEl = document.getElementById('inputFile');
        if (fileEl) {
            console.log('Upload triggered', fileEl);
            let uploadIds = uploader.upload(fileEl, {
                data: {/* Arbitrary data... */}
            });
        }
    });


//Selecting a private chat
    $('#users').on('click', 'li.userElement', (event) => {

        privateChatUser = $(event.target).text();
        $('#chatPartner').text(privateChatUser);
        let privateChat = userList[privateChatUser].messages;

        if (privateChat) {
            $('#messages').empty();
            privateChat.forEach((messageObj) => { //data=> {sender,message}
                $('#messages').append($('<li>').text(createMessageFromMessageObj(messageObj)));
            });
        }
    });

//Selecting the home chat
    $('#homeChat').click(() => {
        $('#messages').empty();
        privateChatUser = undefined;
        $('#chatPartner').text('Everyone');
        homeChat.forEach((messageObject) => {
            $('#messages').append($('<li>').text(createMessageFromMessageObj(messageObject)));
        });
    });


//Receiving a message
    socket.on('chat message', (messageObj = {timeStamp, sender, message}) => {
        homeChat.push(messageObj);
        if (messageObj.sender !== $('#yourName').text()) {
            $('#messages').append($('<li class="usermessage">').text(createMessageFromMessageObj(messageObj)));
        } else {
            $('#messages').append($('<li class="yourmessage">').text(createMessageFromMessageObj(messageObj)));
        }
    });

//Receiving an updated user list
    socket.on('user list', (userArray) => {
        $('#users').empty();

        userArray.forEach((user) => {  //users are Strings
            if (user !== $('#yourName').text()) {
                userList[user] = {user: user, messages: []};
                $('#users').append($('<li class="userElement">').text(user));
            }
        });
    });

//receiving a private message
    socket.on('private message', (messageObj = {timeStamp, sender, receiver, message}) => {


        if (userList[messageObj.sender]) {
            userList[messageObj.sender].messages.push(messageObj);
        } else if (userList[messageObj.receiver]) {
            userList[messageObj.receiver].messages.push(messageObj);
        }
        //print message if chat is open
        if (privateChatUser === messageObj.sender || (privateChatUser === messageObj.receiver && messageObj.sender === $('#yourName').text())) {
            $('#messages').append($('<li>').text(createMessageFromMessageObj(messageObj)));
        } else {

        }
    });


//File upload events
    uploader.on('start', (fileInfo) => {
        console.log('Start uploading', fileInfo);
    });
    uploader.on('stream', (fileInfo) => {
        console.log('Streaming... sent ' + fileInfo.sent + ' bytes.');
    });
    uploader.on('complete', (fileInfo) => {
        console.log('Upload Complete', fileInfo);
    });


    $('#fileChooseTrigger').click(() => {
        $('#inputFile').click();
    });


    function createMessageFromMessageObj(messageObj) {
        return messageObj.sender + ': ' + messageObj.message + '|' + messageObj.timeStamp;
    }

})
;