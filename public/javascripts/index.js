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
            privateChat.forEach((data) => { //data=> {sender,message}
                $('#messages').append($('<li>').text('data.sender: ' + data.message));
            });
        }
    });

    //Selecting the home chat
    $('#homeChat').click(() => {
        $('#messages').empty();
        privateChatUser = undefined;
        $('#chatPartner').text('Everyone');
        homeChat.forEach((message) => {
            $('#messages').append($('<li>').text(message));
        });
    });


    //Receiving a message
    socket.on('chat message', (msg) => {  //Todo seperate message and user
        homeChat.push(msg);
        $('#messages').append($('<li>').text(msg));
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
    socket.on('private message', (data) => {
        let sender = data.sender;
        let receiver = data.receiver;
        if (userList[sender]) {
            userList[sender].messages.push(data);
        }
        if (privateChatUser === sender || (privateChatUser === receiver && sender === $('#yourName').text())) {
            $('#messages').append($('<li>').text(sender + ': ' + data.message));
        }
    });

    socket.on('end upload', () => {
        console.log('file successful uploaded');
    });

    socket.on('upload error', (err) => {
        console.log(err);
    });

});