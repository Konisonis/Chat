const mysql = require('mysql');


//MySQL Database connection
let connection = mysql.createConnection('mysql://admin:UMRWFLKJZJBECNJA@sl-eu-fra-2-portal.4.dblayer.com:18303/mysql');

//validate user login and get profile picture
function login(user, password) {
    user = user.toLowerCase();
    let query = 'select username,password,image from users where username="' + user + '"';
    let status = {success: false, message: ''};
    return new Promise((resolve, reject) => {
        connection.query(query, (err, rows) => {
            if (err) {
                status.message = 'Internal server error';
            }else if(!rows[0]) {
                status.message = 'Wrong username';
            }
            else{
                if (rows[0].username && rows[0].password) {
                    //login was successful or not
                    status.success = password === rows[0].password;
                    if(!status.success){
                        status.message = 'Wrong password';
                    }
                    if(rows[0].image && status.success){
                        status.image = rows[0].image;
                    }

                }
            }
            resolve(status);
        });
    });
}

//register a user
function register(user, password, image) {
    user = user.toLowerCase();
    let status = {success: false, message: ''};
    return new Promise((resolve, reject) => {
        if (user && password) {
            let query = '';
            //image is alternatively
            if (image) {
                query = 'insert into users(username,password,image) values("' + user + '","' + password + '","' + image + '");';
            } else query = 'insert into users(username,password) values("' + user + '","' + password + '");';

            connection.query(query, (err) => {
                if (err) {
                    console.log(err);
                    status.message = 'Something went horribly wrong!  '; //If username already taken an error is thrown
                } else {
                    status.success = true;
                }
                resolve(status);
            });
        } else {
            status.message = 'There is a problem with the username or password! Please try again!  ';
            resolve(status);
        }
    });
}


module.exports = {login, register};