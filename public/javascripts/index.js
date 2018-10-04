$(() => {
    var socket = io();
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

    //send a chat message to everyone
    $('#chatForm').submit(() => {
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });

    socket.on('chat message', (msg) => {
        $('#messages').append($('<li>').text(msg));
    });

    socket.on('user list', (userArray) => {
        $('#users').empty();
        userArray.forEach((user) => {
            $('#users').append($('<li>').text(user));
        });
    });

});