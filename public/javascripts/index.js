$(() => {
    let socket = io();

    let fileReader = new FileReader();

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

    //send a file
    $('#sendFile').click(() => {
        let file = $('#inputFile')[0].files[0];
        let slice = file.slice(0, 100000);
        fileReader.readAsArrayBuffer(slice);
        fileReader.onload = (evt) => {
            let arrayBuffer = fileReader.result;
            socket.emit('slice upload', {
                name: file.name,
                type: file.type,
                size: file.size,
                data: arrayBuffer
            });
        };
        socket.on('request slice upload', (data) => {
            let place = data.currentSlice * 100000,
                slice = file.slice(place, place + Math.min(100000, file.size - place));
            fileReader.readAsArrayBuffer(slice);
        });
    });

    //Selecting a private chat
    $('#users').on('click', 'li.userElement', (event) => {
        console.log($(event.target).text());

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
        $('#messages').append($('<li>').text(createMessageFromMessageObj(messageObj)));
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

        console.log(messageObj);

        if (userList[messageObj.sender]) {
            userList[messageObj.sender].messages.push(messageObj);
        } else if (userList[messageObj.receiver]) {
            userList[messageObj.receiver].messages.push(messageObj);
        }

        if (privateChatUser === messageObj.sender || (privateChatUser === messageObj.receiver && messageObj.sender === $('#yourName').text())) {
            $('#messages').append($('<li>').text(createMessageFromMessageObj(messageObj)));
        }
    });

    socket.on('end upload', () => {
        console.log('file successful uploaded');
    });

    socket.on('upload error', (err) => {
        console.log(err);
    });


    function createMessageFromMessageObj(messageObj) {
        return messageObj.sender + ': ' + messageObj.message + '|' + messageObj.timeStamp;
    }

});