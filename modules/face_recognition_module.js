var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
var fs = require('fs');

var visualRecognition = new VisualRecognitionV3({
    version: '2018-03-19',
    iam_apikey: 'gaKYyybTBcCMsD18_0NdMvapicl6lKcfXyhLu_e0yfcT'
});


function hasFace(path){

    let stream = fs.createReadStream(path);

    let params = {
        images_file: stream
    };

    return new Promise((resolve,reject)=>{
        visualRecognition.detectFaces(params, (err, response)=> {
            let hasFace = false;
            if (err) {
                console.log(err);
            } else {
                let result = JSON.stringify(response, null, 2).toString();
                result = JSON.parse(result);

                if(result.images[0].faces.length > 0){
                    //Picture contains face
                    hasFace = true;
                }
            }
            resolve(hasFace);
        });
    });
}

module.exports = {hasFace};