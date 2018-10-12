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
    $('#chatForm').submit((event) => {
        event.preventDefault();
        //private chat
        if (privateChatUser) {
            socket.emit('private message', $('#m').val(), privateChatUser);
            //public chat
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
            let uploadIds = uploader.upload(fileEl, {
                data: {/* Arbitrary data... */}
            });
        }
    });


//Selecting a private chat
    $('#users').on('click', 'button.userElement', (event) => {
        privateChatUser = $(event.target).val();
        $('#chatPartner').text(privateChatUser);
        let privateChat = userList[privateChatUser].messages;


        if (privateChat) {
            $('#messages').empty();
            privateChat.forEach((messageObj) => { //data=> {sender,message}
                appendMessageToChat(messageObj);
            });
        }
    });

//Selecting the home chat
    $('#homeChat').click(() => {
        $('#messages').empty();
        privateChatUser = undefined;
        $('#chatPartner').text('Everyone');
        homeChat.forEach((messageObj) => {
            appendMessageToChat(messageObj)
        });
    });


//Receiving a message
    socket.on('chat message', (messageObj = {timeStamp, sender, message}) => {
        homeChat.push(messageObj);
        appendMessageToChat(messageObj);
    });

//Receiving an updated user list
    socket.on('user list', (userArray) => {
        $('#users').empty();//TODO delets every chat history

        userArray.forEach((user) => {  //users are Strings
            if (user !== $('#yourName').text()) {
                userList[user] = {user: user, messages: []};
                $('#users').append('<li><i class="material-icons">face</i>\n<button type="button" class="userElement btn btn-primary" value="' + user + '">\n' +
                    '                    ' + user + '<span class="badge badge-light"></span>\n' +
                    '                    <span class="sr-only"></span>\n' +
                    '                </button></li>');

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
            appendMessageToChat(messageObj);
        } else {

        }
    });



//File upload events
    uploader.on('start', (fileInfo) => {
        $('#fileChooseTrigger').attr('disabled',true);
    });
    uploader.on('stream', (fileInfo) => {
        if (fileInfo.size > 0) {
            $('.progress-bar').css('width', fileInfo.sent /fileInfo.size *100 + '%');
        }
    });

    uploader.on('complete', (fileInfo) => {
        $('.progress-bar').css('width', 100+ '%');
        $('#fileChooseTrigger').attr('disabled',false);


    });


    $('#fileChooseTrigger').click(() => {
        $('.progress-bar').css('width', 0+ '%');
        $('#inputFile').click();
    });

    function appendMessageToChat(messageObj) {
        let chatType;
        if (messageObj.sender !== $('#yourName').text()) {
            chatType = "usermessage";
        } else {
            chatType = "yourmessage";
        }
        let messages = $('#messages');

        messages.append(createMessageHtml(messageObj, chatType));
        messages.scrollTop(messages[0].scrollHeight);
    }


    //Creates a message html element with all information it needs
    function createMessageHtml(messageObj, chatType) {
        let message = '';
        message += '<div class="' + chatType + '">';
        if (chatType !== "yourmessage") {
            message += '<div class="sender">' + messageObj.sender + '</div>';
        }
        message += '<div class="message">' + messageObj.message + '</div>';
        message += '<div class="timestamp">' + messageObj.timeStamp + '</div>';
        message += '</div>';
        return message;
    }
})
;