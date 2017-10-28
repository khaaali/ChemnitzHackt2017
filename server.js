/** 
This is a server application for handling the web application to upload images and extract geolocations.

**/

/** Importing modules **/

var express = require("express"),
    app = express(),
    formidable = require('formidable'),
    util = require('util'),
    fs = require('fs-extra'),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');
var http = require('http');
var server = http.createServer(app).listen(3000);
var shell = require('shelljs'); // executes system defined calls or scripts
var exec = require('child_process').exec;
var _ = require('lodash');
app.use(bodyParser.urlencoded({ extended: false }))
var ExifImage = require('exif').ExifImage;
var moment = require("moment")


/* Image directories used for uploding and retrieving images */

var imageDir = "/home/sairam/Desktop/chemnitz/C/ChemnitzHackt2017/src/uploads/";

var coordinates = []

function between(x, min, max) {
    return x >= min && x <= max;
}



/*
Routing application and rendering views 
*/

app.use(express.static(path.join(__dirname, 'src')));

app.get("/", function(req, res) {

    res.sendFile(__dirname + '/src/index.html');
});

app.get("/home", function(req, res) {

    res.sendFile(__dirname + '/src/index.html');
});

app.get("/upload", function(req, res) {
    res.sendFile(__dirname + '/src/upload.html');
});

app.get("/settings", function(req, res) {
    res.sendFile(__dirname + '/src/settings.html');
    //res.redirect('/upload_image');
});




app.post('/uploadImage', function(req, res) {
    var form = new formidable.IncomingForm();
    form.multiples = true
    form.keepExtensions = true
    files = [];
    //fields = [];
    form.parse(req, function(err, fields, files) {

    });
    
    form.on('file', function(field, file) {
            // Temporary location of uploaded file 

            //console.log(field, file);
            files.push(file);
            console.log(file.path);
            console.log('in upload')
            console.log(files.length)
            console.log(files)
            //for (var img = 0; img < files.length; img++) {
            var temp_path = file.path;
            console.log('here1')
            console.log(temp_path)
            //The file name of the uploaded file 
            console.log('here2')
            var file_name = file.name;
            console.log('here3')
            console.log(file_name)
            // Location where we want to copy the uploaded file
            var new_location = imageDir;
            fs.copy(temp_path, new_location + file_name, function(err) {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log("success!", new_location + file_name)
                        var image_name = new_location + file_name

                        try {
                            console.log('received getGps');

                            new ExifImage({ image: image_name }, function(error, exifData) {
                                    if (error) {
                                        console.log('Error: ' + error.message);
                                        var image = "png"
                                    } else {
                                        console.log(exifData);
                                    }

                                    if (!image) {
                                        var lat = exifData.gps.GPSLatitude;
                                        var lon = exifData.gps.GPSLongitude;
                                        var dateTime = exifData.exif.DateTimeOriginal

                                        var latRef = exifData.gps.GPSLatitudeRef || "N";
                                        var lonRef = exifData.gps.GPSLongitudeRef || "W";
                                        lat = (lat[0] + lat[1] / 60 + lat[2] / 3600) * (latRef == "N" ? 1 : -1);
                                        lon = (lon[0] + lon[1] / 60 + lon[2] / 3600) * (lonRef == "W" ? -1 : 1);

                                        var lat_long_time = {
                                            latitude: lat,
                                            longitude: lon,
                                            datetime: dateTime,
                                            imageName:file_name
                                        };
                                        coordinates.push(lat_long_time)
    									console.log(coordinates)

    									sendMail(lat,lon,dateTime,file_name)


    									res.end(JSON.stringify(coordinates))

                                } else {
                                    console.log("No gps coordinates available for the image")
                                }
                            });
                    } catch (error) {
                        console.log('Error: ' + error.message);
                    }


                }
            });
        // }
    }); 
    //res.redirect('/upload_image');
});




app.get("/getMapCoordinates", function(req, res) {
    res.json(coordinates)
});







app.get("/upload_showImageList", function(req, res, next) {
    getImages(imageDir, function(err, files) {
        var imageLists = [];
        for (var i = 0; i < files.length; i++) {
            imageLists.push(files[i]);
        }
        //console.log(files.length);
        console.log('upload_showImageList');
        console.log(imageLists);
        res.json(imageLists);
    });
});


app.get("/upload_image/:imageId", function(req, res) {
    console.log(req.params.imageId);
    var id = req.params.imageId;
    var command = "epdc-app -update_image" + " " + imageDir + id
    var child = exec(command, { async: true });
    child.stdout.on('data', function(data) {
        //console.log(data)
    });
    shell.echo(command)
    res.setHeader("Content-Type", "text/html");
    res.redirect('/upload_image');
});

app.delete("/deleteImage/:id", function(req, res) {
    var id = req.params.id;
    console.log("Got a DELETE request for", id);
    fs.unlink(imageDir + id);
    console.log(imageDir + id);
    res.send('Hello DELETEIMAGE');
});

/******************Upload Image End**************************/



function applyDivision(value) {
    var tokens = value.split(',');
    return parseInt(tokens[0], 10) / parseInt(tokens[1], 10);
}

function format(str, values) {
    Object.keys(values).forEach(function(key) {
        str = str.replace('{' + key + '}', values[key]);
    });

    return str;
}


app.get('*', function(req, res) {

    res.sendFile(__dirname + '/src/index.html');
});

console.log('Listening on localhost port 3000');

module.exports = app;



// filter to retrieve png, jpeg, jpg images from ../demo_images  
function getImages(imageDir, callback) {
    var fileType1 = '.png',
        fileType2 = '.jpeg',
        fileType3 = '.jpg',
        files = [],
        i;
    fs.readdir(imageDir, function(err, list) {
        for (i = 0; i < list.length; i++) {
            if (path.extname(list[i]) === fileType1 || path.extname(list[i]) === fileType3 || path.extname(list[i]) === fileType2) {
                files.push(list[i]); //store the file name into the array files
            }
        }
        callback(err, files);
    });
}

function sendMail(lat, lon, dateTime, imageName) {

  
  var time_now = moment().format('YYYY-MM-DD HH:mm:ss')

  var mailer = require("nodemailer");
  var Transport = mailer.createTransport({
    service: "Gmail",
    auth: {
      user: "astrose.enas@gmail.com",
      pass: "sairamaaaa4"
    }
  });


  subject = "Garbage Notifications";

  content =
    "<h1 align='center'><font color='#008b46'> Garbage Notification </font></h1>" + "<br>" 

    +
    "<h3 align='left' >Latitude:" + " " + "</h3>" + lat +
    "<br>" +
    "<h3 align='left' >Longitude:" + " " + "</h3>" + lon +
    "<br>" +
    "<h3 align='left' >Date and Time:" + " " + "</h3>" + dateTime +
    "<br>" +
    "<h3 align='left' >Image Name:" + " " + "</h3>" + imageName +
    "<br>"

  //console.log(content);

  var mail = {
    from: "astrose.enas@gmail.com",
    to: "rayapativenkat.crr@gmail.com",
    subject: subject,
    text: "Garbage Notifications",
    html: content
  }

   
  Transport.sendMail(mail, function(error, response) {
     if (error) {
       console.log(error);
     } else {
       console.log("Message sent: ");
     }
     Transport.close();
   });
   
  console.log('The answer to life, the universe, and everything!', mail);
}












// redirects page to upload_image.html
function redirectRouterUploadPage(req, res) {
    res.sendFile(__dirname + '/src/upload_image.html');
}