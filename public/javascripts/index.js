$(() => {
    let socket = io();

    let fileReader = new FileReader();


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
        }

        socket.on('request slice upload', (data) => {
            let place = data.currentSlice * 100000,
                slice = file.slice(place, place + Math.min(100000, file.size - place));
            fileReader.readAsArrayBuffer(slice);
        });
    });

    socket.on('end upload', () => {
        console.log('file successful uploaded');
    });

    socket.on('upload error', (err) => {
        console.log(err);
    });

});