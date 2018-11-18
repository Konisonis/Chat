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
                let body = Buffer.concat(chunks);
                let mood = body.toString();
                mood = JSON.parse(mood);
                resolve(mood.mood);

            });
        });
        req.write(JSON.stringify({
            texts:
                [text]
        }));
        req.end();
    });
}

module.export = {getMood};