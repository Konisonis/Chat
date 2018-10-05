$(() => {
    var socket = io();

    //Log in with user name
    $('#loginForm').submit(() => {
            socket.emit('login', $('#user').val(), (ok) => {
                if (ok) {
                    $('#chat').show();
                    $('#modal').modal('toggle');
                    $('#loginModal').hide();
                } else {
                    $('#user').val('');
                    $('.alert').show();
                }
            });
            return false;
        }
    );

    //send a chat message to everyone in the chat
    $('#chatForm').submit(() => {
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });

    //send a file
    $('#sendFile').click(()=>{
        let file = $('#inputFile').val();
        if(file){
            socket.emit('file', file,()=>{
                console.log('file successfully uploaded');
            });
        }
    });

    //Receiving a message
    socket.on('chat message', (msg) => {
        $('#messages').append($('<li>').text(msg));
    });

    //Receiving an updated user list
    socket.on('user list', (userArray) => {
        $('#users').empty();
        userArray.forEach((user) => {
            $('#users').append($('<li>').text(user));
        });
    });

    //Receiving a file
    socket.on('file',(file)=>{

    });

});