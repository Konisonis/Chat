const mysql = require('mysql');


//MySQL Database connection
let connection = mysql.createConnection('mysql://admin:UMRWFLKJZJBECNJA@sl-eu-fra-2-portal.4.dblayer.com:18303/mysql');


function login(user, password) {
    let query = 'select username,password from users where username="'+user+'"';
    return new Promise((resolve, reject)=>{
        connection.query(query, (err, rows) => {
            if(err || !rows[0]){
                resolve(false);
            }else{
                if(rows[0].username && rows[0].password){
                    resolve(password === rows[0].password);
                }
            }
        });
    });
}

function register(user, password) {
    let status = {success: false, message:''};
    return new Promise((resolve,reject)=>{
        if(user && password){
            let query = 'insert into users(username,password) values("' + user + '","' + password + '");';
            connection.query(query, (err) => {
                if(err){
                    console.log(err);
                    status.message = 'Username already taken'; //If username already taken an error is thrown
                }else{
                    status.message = true;
                }
                resolve(status);
            });
        }else { status.message = 'There is a problem with the username or password! Please try again!';
            resolve(status);
        }
    });
}

function checkIfUsernameAlreadyTaken(username){

}

module.exports = {login,register};