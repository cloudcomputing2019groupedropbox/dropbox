var express = require('express');
var request = require('request');
var async = require('async');
var router = express.Router(); 
var cryptoM = require('./../../public/modules/cryptoM.js');
var fs = require('fs');
var mkdirp = require('mkdirp');

function mkdownloaddir(userid, callback){
	var dir="./views/download/"+userid;
	mkdirp(dir, function (err) {
    if (err){ 
		console.log(false);
		callback(false);
	}else{ 
		console.log(dir);
		callback(true);
	}
	});
}

router.post('/', function(req, res, next) {
    var user_id=req.body.user_id;
    var user_pw=req.body.user_pw;
    var sqlquery = "SELECT  * FROM users WHERE user_id = ?";
    connection.query(sqlquery, user_id,function (err, rows) {
            if (err) {
                console.log("no match");
                res.render('userlogin/main/main',{
                    msg: "아이디나 비밀번호가 일치하지 않습니다."
                });
            } else {
                var bytes =cryptoM.decrypt(rows[0].user_pw);
                if(bytes===user_pw) {
                    console.log("user login successfully");
                    /*req.session.user_id = {
                        user_id: rows[0].user_id
                    };*/
					req.session.user_id=rows[0].user_id;
					mkdownloaddir(req.session.user_id, function(result){
						if(result==true){
							console.log("mkdirtrue!");
							var url='/dropbox/drive/'+req.session.user_id;
                    		res.redirect(url);	
						}else{
							res.redirect('back');
						}
					});
                }else{
                    console.log("wrong password!");
                    res.render('userlogin/main/main',{
                        msg : "아이디나 비밀번호가 일치하지 않습니다."
                    });
                }

            }
        });
});

router.use(express.static('views/userlogin/main'));
router.get('/', function(req, res, next) {
    res.render('userlogin/main/main');
    //res.redirect('/');
});

// router.get('/api/getUsername', function(req, res, next) {
//     res.render('userlogin/user',{
//         username: "Login"
//     });
//     //res.redirect('/');
// });
module.exports = router;