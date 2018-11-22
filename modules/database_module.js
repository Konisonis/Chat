const mysql = require('mysql');


//MySQL Database connection
let connection = mysql.createConnection('mysql://admin:UMRWFLKJZJBECNJA@sl-eu-fra-2-portal.4.dblayer.com:18303/mysql');


function login(user, password) {
    user = user.toLowerCase();
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

function register(user, password, image) {
    user = user.toLowerCase();
    let status = {success: false, message:''};
    return new Promise((resolve,reject)=>{
        if(user && password){
            let query = 'insert into users(username,password) values("' + user + '","' + password +'");';
        //,BINARY('+image+')
            connection.query(query, (err) => {
                if(err){
                    console.log(err);
                    status.message = 'Something went horribly wrong!  '; //If username already taken an error is thrown
                }else{
                    status.success = true;
                }
                resolve(status);
            });
        }else { status.message = 'There is a problem with the username or password! Please try again!  ';
            resolve(status);
        }
    });
}


module.exports = {login,register};