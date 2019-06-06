var express = require('express');
var request = require('request');
var async = require('async');

var cryptoM = require('./../../public/modules/cryptoM.js');
var S3= require('./../../public/modules/s3/s3.js');

var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('userlogin/register',{
        msg: "register"
    });
});

router.post('/', function(req, res, next) {
    var user_id=req.body.user_id;
    var user_pw=req.body.user_pw;
    var user_email=req.body.user_email;
    var user_name=req.body.user_name;
    var user_phone=req.body.user_phone;

    var sqlquery = "SELECT  * FROM users WHERE user_id = ?";
        connection.query(sqlquery, user_id, function (err, rows) {
            if (rows.length == 0) {
                user_pw=cryptoM.encrypt(user_pw);
                console.log(user_pw);
                var sql = 'INSERT INTO `users` (`user_id`, `user_pw`,  `user_email`, `user_name`, `user_phone`) VALUES ?;';
                var values = [[user_id, user_pw, user_email, user_name, user_phone]];
                connection.query(sql, [values], function (err) {
                    if (err) {
                        console.log("inserting user failed");
                        throw err;
                    } else {
						S3.userInit(S3.TEST_BUCKET_NAME, user_id, function (result)
						{
							console.log('result: ' + result);
							if(result==1){
								console.log("user inserted successfully");
                        		res.redirect('/login');
							}
							else
								{
									console.log('bucket insert failed');
									res.redirect("/login");
								}
						});
                        
                    }
                });
            } else {
                console.log("이미 있는 ID, ID를 다시 입력해주세요!");
                res.redirect("/login");
                throw err;
            }
        });
});

module.exports = router;
