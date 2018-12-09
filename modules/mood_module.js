const https = require("https");

function getMood(text) {

    return new Promise((resolve, reject) => {

        let options = {
            "method": "POST",
            "hostname":
                "peaceful-morse.eu-de.mybluemix.net",
            "path": [
                "tone"
            ],
            "headers": {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
            }
        };

        let req = https.request(options, (res) => {
            let chunks = [];

            res.on("data", (chunk) => {
                chunks.push(chunk);
            });

            res.on("end", () => {
                try {
                    let body = Buffer.concat(chunks);
                    let mood = body.toString();
                    mood = JSON.parse(mood);
                    resolve(mood.mood);
                }catch(err){
                    resolve('');
                }

            });
        });
        req.write(JSON.stringify({
            texts:
                [text]
        }));
        req.end();
    });
}

module.exports = {getMood};