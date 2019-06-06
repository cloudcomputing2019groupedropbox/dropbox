var mysql      = require('mysql');

connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  port     : 3306,
  database : 'dropbox',
  //insecureAuth : true
});