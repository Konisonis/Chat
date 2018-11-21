/*
* Authors:
* "Robin Schramm 761392",
  "Konstantin Rosenberg 761385"
* */

$(() => {
    const socket = io();

    let homeChat = [];
    let userList = {};

    let privateChatUser;

    //Log in with user name
    $('#loginForm').submit(() => {
            socket.emit('login', $('#login-user').val(),$('#login-password').val(), (ok) => {
                if (ok) {
                    $('#chat').show();
                    $('#login-modal').modal('toggle');
                    $('#front-page').hide();
                    $('#yourName').text($('#login-user').val());
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


    $('#register-password, #register-confirm-password').on('keyup', ()=> {
        if ($('#register-password').val() == $('#register-confirm-password').val()) {
            $('#message').html('Matching').css('color', 'green');
        } else {
            $('#message').html('Not Matching').css('color', 'red');
        }
    });

    //Registration
    $('#registerForm').submit((event)=>{
        event.preventDefault();


        let user = $('#register-user').val();
        let password = $('#register-password').val();
        let confirmPassword = $('#register-confirm-password').val();

        if(password === confirmPassword){
            socket.emit('registration',user, password, (success, statusMessage)=>{
                if(success){
                    $('#register-modal').modal('toggle');
                    console.log('Registration was successfull');

                }
                else{
                    console.log(statusMessage);
                }
            });
        }

    });

    //Start file upload
    $('#inputFile').change((e) => {
        let file = e.target.files[0];
        if (file) {
            let stream = ss.createStream();

            // upload a private file to the server.
            if (privateChatUser) {
                ss(socket).emit('private file', stream, {
                    receiver: privateChatUser,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            } else {
                // upload a public file to the server.
                ss(socket).emit('public file', stream, {name: file.name, size: file.size, type: file.type});
            }
            let blobStream = ss.createBlobReadStream(file);

            //Update progress bar
            let size = 0;
            blobStream.on('data', (chunk) => {
                size += chunk.length;
                $('.progress-bar').css('width', size / file.size * 100 + '%');
            });
            blobStream.pipe(stream);
        }
    });

    //Receiving a message
    socket.on('chat message', (messageObj = {timeStamp, sender, message,mood}) => {
        homeChat.push(messageObj);
        appendMessageToChat(messageObj);
    });

    //receiving a private message
    socket.on('private message', (messageObj = {timeStamp, sender, receiver, message,mood}) => {

        let senderChatIsOpen = privateChatUser === messageObj.sender;
        let ownMessageAndChatIsOpen = privateChatUser === messageObj.receiver;

        let user = messageObj.sender;

        //Check wether i'm the sender or the receiver
        if (userList[user]) {
            userList[user].messages.push(messageObj);
        } else{
            user = messageObj.receiver;
            userList[user].messages.push(messageObj);
        }
        //print message if chat is open
        if (senderChatIsOpen || ownMessageAndChatIsOpen) {
            appendMessageToChat(messageObj);
        }else{
            showNewMessageIcon(user);
        }
    });

    //receiving a public file
    ss(socket).on('public file', (stream, data) => {
        let binaryData = [];

        stream.on('data', (chunk) => {
            binaryData.push.apply(binaryData, chunk); //Put pieces together
        });
        stream.on('end', () => {
            let blob = new Blob([new Uint8Array(binaryData)]);
            let fileUrl = URL.createObjectURL(blob);
            let fileObject = {
                sender: data.sender,
                timeStamp: data.timeStamp,
                fileName: data.name,
                fileURL: fileUrl,
                type: data.type
            };
            //Print message
            appendMessageToChat(fileObject);
            //add message to the home chat
            homeChat.push(fileObject);

            $('.progress-bar').attr('class', 'progress-bar');
        });
    });

    //receiving a private file
    ss(socket).on('private file', (stream, data) => {
        let binaryData = [];

        stream.on('data', (chunk) => {
            binaryData.push.apply(binaryData, chunk); //Put pieces together
        });
        stream.on('end', () => {
            let blob = new Blob([new Uint8Array(binaryData)]);
            let fileUrl = URL.createObjectURL(blob);
            let fileObject = {
                sender: data.sender,
                timeStamp: data.timeStamp,
                fileName: data.name,
                fileURL: fileUrl,
                type: data.type,
                receiver: data.receiver
            };

            let senderChatIsOpen = privateChatUser === fileObject.sender;   //TODO redundant code
            let ownMessageAndChatIsOpen = privateChatUser === fileObject.receiver;

            let user = fileObject.sender;

            //Check wether i'm the sender or the receiver
            if (userList[user]) {
                userList[user].messages.push(fileObject);
            } else{
                user = fileObject.receiver;
                userList[user].messages.push(fileObject);
            }
            //print message if chat is open
            if (senderChatIsOpen || ownMessageAndChatIsOpen) {
                appendMessageToChat(fileObject);
            }else{
                showNewMessageIcon(user);
            }

            $('.progress-bar').attr('class', 'progress-bar');
        });
    });

    //Trigger the file chooser
    $('#fileChooseTrigger').click(() => {
        $('.progress-bar').css('width', 0 + '%');
        $('.progress-bar').addClass('progress-bar-striped progress-bar-animated');
        $('#uploadFinished').hide();
        $('#inputFile').click();
    });

    //Selecting a private chat
    $('#users').on('click', 'button.userElement', (event) => {
        privateChatUser = $(event.target).val();
        $('#chatPartner').text(privateChatUser);
        let privateChat = userList[privateChatUser].messages;

        //hide new_message icon
        hideNewMessageIcon(privateChatUser);

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
            appendMessageToChat(messageObj);
        });
    });




    //Adds a message to the chat
    function appendMessageToChat(messageObj) {
        let chatType;

        if (messageObj.sender !== $('#yourName').text()) {
            chatType = "usermessage";
        } else {
            chatType = "yourmessage";
        }
        let messages = $('#messages');

        selectTypeOfMessage(messageObj, chatType);
        messages.scrollTop(messages[0].scrollHeight);
    }

    //detects whether the message is a file or text
    function selectTypeOfMessage(messageObj, chatType) {
        if (messageObj.message) {
            createMessageHtml(messageObj, chatType,'<div class="message">' + messageObj.message + '</div>')
        }
        else if (messageObj.type.toString().includes("image/")) {
            createMessageHtml(messageObj, chatType,'<div><img alt="' + messageObj.fileName + '" id="picture" src="' + messageObj.fileURL + '" ></div>');
        } else if (messageObj.fileURL) {
            createMessageHtml(messageObj, chatType,'<div><a href="' + messageObj.fileURL + '" download="' + messageObj.fileName + '">' + messageObj.fileName + '</a></div>');
        }
    }

    //Creates a message html element with all information it needs
    function createMessageHtml(messageObj, chatType,htmlTag) {
        let message = '';
        message += '<div class="' + chatType + '">';
        if (chatType !== "yourmessage") {
            message += '<div class="sender">' + messageObj.sender + '</div>';
        }
        message += htmlTag;
        if(messageObj.mood){
            message += '<div class="mood">Mood :' + messageObj.mood + '</div><br>';
        }
        message += '<div class="timestamp">' + messageObj.timeStamp + '</div>';
        message += '</div>';
        $('#messages').append(message);
    }


    //Update the list of users is the chat
    function updateUsers() {
        $('#users').empty();
        Object.entries(userList).forEach(([key, value]) => {  //key => username, value=> {user, messages}
            if (key !== $('#yourName').text()) {
                $('#users').append('<li><i class="material-icons">face</i>\n<button type="button" class="userElement btn btn-primary" value="' + key + '">\n' +
                    '                    ' + value.user + '<span class="badge badge-light"></span>\n' +
                    '                    <span class="sr-only"></span><i style="display:none;" title="'+key+'" class="material-icons newMessage">new_releases</i>\n' +
                    '                </button></li>');
            }
        });
    }
    //Show the user that he received a new private message
    function showNewMessageIcon(user){
        if(privateChatUser !== user){
            let element =$(".newMessage[title='"+user+"']");
            element.show();

        }
    }

    function hideNewMessageIcon(user){
        let element =$(".newMessage[title='"+user+"']");
        element.hide();

    }

    //Receiving an updated user list
    socket.on('user list', (users) => {  //users = [userName1, userName2]
        $('#users').empty();
        users.forEach((user) => {
            if ($('#yourName').text() !== user) {
                userList[user] = {user: user, messages: []};
            }
        });
        updateUsers();
    });

    socket.on('user joined', (user) => {
        userList[user] = {user: user, messages: []};
        updateUsers();
    });

    socket.on('user left', (user) => {
        delete userList[user];  // Remove key from json object
        updateUsers();
    });
})
;