require('dotenv').config();
const objectAssign = require('object-assign');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require("nodemailer");
const app = express();

// airtable setup
const airtable = require('airtable');
airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_KEY
});
const airtableBase = airtable.base('app3ydZAmRjmNCSrj');

if (process.env.NODE_ENV == "development") {
  app.set('port', (process.env.PORT_DEVELOPMENT))
}

if (process.env.NODE_ENV == "production") {
  app.set('port', process.env.PORT_PRODUCTION)
}

// prevent from throwing CORS error
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.disable('x-powered-by')


// Additional middleware which will set headers that we need on each request.
app.use(function(req, res, next) {
  // Disable caching so we'll always get the latest comments.
  res.setHeader('Cache-Control', 'no-cache')
  next()
})

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'kmartinezmedia@gmail.com',
      pass: process.env.GMAIL_PASSWORD
  }
})

app.post('/contact', function(req,res) {
  let mailOptions = {
    to : req.query.to,
    subject : req.query.subject,
    text : req.query.text
  }
  console.log(mailOptions);
  transporter.sendMail(mailOptions, function(error, response){
    if(error){
      console.log(error);
      res.end("error");
    } else {
      res.send("sent");
      transporter.close();
    }
  });
})

// get work record from airtable with an id
app.get('/work/:id', function(req, res) {
  const id = req.params.id;
  airtableBase("work").find(id, function(err, record) {
    if (err) { console.error(err); return; }
    res.send(record)
  });
})


app.get('/:table', function(req, res) {
  const table = req.params.table;
  let sortQuery;
  if (req.query.hasOwnProperty('sort')) {
    const arrayOfSorts = req.query.sort.map((item, i) =>  JSON.parse(item))
    sortQuery = {
      sort: arrayOfSorts
    }
  }

  const params = objectAssign({view: 'Main View'}, sortQuery);
  airtableBase(table).select(params).firstPage(function(err, records) {
      if (err) { console.error(err); return; }
      res.send(records)
  });
})

app.post('/:table', function(req, res) {
  var table = req.params.table;
  airtableBase(table).create(req.body, {typecast: true}, function(err, record) {
    if (err) { 
      console.error(err); return; 
    }
    res.send(record.getId())
  })
})


app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/')
})