$(() => {
    const socket = io();

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
    $('#inputFile').change((e) => {
        //let fileEl = document.getElementById('inputFile');
        let file = e.target.files[0];
        if (file) {
            let stream = ss.createStream();
            // upload a file to the server.
            if (privateChatUser) {
                ss(socket).emit('private file', stream, {name: file.name, size: file.size, type: file.type});
            }else{
                ss(socket).emit('public file', stream, {name: file.name, size: file.size, type: file.type});
            }
            let blobStream = ss.createBlobReadStream(file);

            let size = 0;
            blobStream.on('data', (chunk) => {
                size += chunk.length;
                $('.progress-bar').css('width', size / file.size * 100 + '%');
            });
            blobStream.pipe(stream);
        }
    });

    //Receiving a message
    socket.on('chat message', (messageObj = {timeStamp, sender, message}) => {
        homeChat.push(messageObj);
        appendMessageToChat(messageObj);
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
            //nothing
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
            let fileObject = {sender: data.sender, timeStamp: data.timeStamp, fileName: data.name, fileURL: fileUrl, type: data.type};
                appendMessageToChat(fileObject);
                homeChat.push(fileObject);
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
            let fileObject = {sender: data.sender, timeStamp: data.timeStamp, fileName: data.name, fileURL: fileUrl, type: data.type};

            if (userList[fileObject.sender]) {
                userList[fileObject.sender].messages.push(fileObject);
            } else if (userList[fileObject.receiver]) {
                userList[fileObject.receiver].messages.push(fileObject);
            }
            //print file if chat is open
            if (privateChatUser === fileObject.sender || (privateChatUser === fileObject.receiver && fileObject.sender === $('#yourName').text())) {
                appendMessageToChat(fileObject);
            } else {
            }
        });
    });

    //Trigger the file chooser
    $('#fileChooseTrigger').click(() => {
        $('.progress-bar').css('width', 0 + '%');
        $('#uploadFinished').hide();
        $('#inputFile').click();
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
    function selectTypeOfMessage(messageObj,chatType) {
        if (messageObj.message) {
            createMessageHtml(messageObj,chatType)
        }
        else if (messageObj.type.toString().includes("image/")) {
            displayPicture(messageObj,chatType);
        }else if(messageObj.fileURL){
            displayDownload(messageObj,chatType);
        }
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
        $('#messages').append(message);
    }

    //Assemble image tag
    function displayPicture(messageObj,chatType) {
        let message = '';
        message += '<div class="' + chatType + '">';
        if (chatType !== "yourmessage") {
            message += '<div class="sender">' + messageObj.sender + '</div>';
        }
        let picture = '<div class="message">' +
            '<img alt="'+messageObj.fileName+'" id="picture" src="' + messageObj.fileURL + '" ></div>';
        message += picture;
        message += '<div class="timestamp">' + messageObj.timeStamp + '</div>';
        message += '</div>';
        $('#messages').append(message);
    }

    function displayDownload(messageObj,chatType) {
        let message = '';
        message += '<div class="' + chatType + '">';
        if (chatType !== "yourmessage") {
            message += '<div class="sender">' + messageObj.sender + '</div>';
        }
        let picture = '<div class="message">' +
            '<a href="' + messageObj.fileURL + '" download="' + messageObj.fileName + '">' + messageObj.fileName + '</a></div>';
        message += picture;
        message += '<div class="timestamp">' + messageObj.timeStamp + '</div>';
        message += '</div>';
        $('#messages').append(message);
    }

    //Update the list of users is the chat
    function updateUsers() {
        $('#users').empty();
        Object.entries(userList).forEach(([key, value]) => {  //key => username, value=> {user, messages}
            if (value.user !== $('#yourName').text()) {
                $('#users').append('<li><i class="material-icons">face</i>\n<button type="button" class="userElement btn btn-primary" value="' + value.user + '">\n' +
                    '                    ' + value.user + '<span class="badge badge-light"></span>\n' +
                    '                    <span class="sr-only"></span>\n' +
                    '                </button></li>');
            }
        });
    }

    //Receiving an updated user list
    socket.on('user list', (users) => {  //users = [userName1, userName2]
        $('#users').empty();
        users.forEach((user) => {
            userList[user] = {user: user, messages: []};
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