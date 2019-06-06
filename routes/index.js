var express = require('express');
var request = require('request');
var router = express.Router();
var mysql      = require('mysql');
var passport = require('passport'),
    KakaoStrategy = require('passport-kakao').Strategy;


passport.use(new KakaoStrategy({
      clientID : '62bb78f5b77f2c050dc82fdb17e339f5',
      callbackURL :'/auth/login/kakao/callback',
    },
    function(accessToken, refreshToken,params, profile, done){
      //사용자 정보는 profile에
      loginByThirdparty(accessToken, refreshToken, profile);

      console.log("(!)로그인 : " + profile._json.id+"("+profile._json.properties.nickname +")");
      //return done(null,profile)
      return done(null, {
        'user_id': profile._json.id,
        'nickname': profile._json.properties.nickname
      });
    }
));

// kakao 로그인
router.get('/auth/login/kakao',
    passport.authenticate('kakao')
);

// kakao 로그인 연동 콜백
router.get('/auth/login/kakao/callback',
    passport.authenticate('kakao', {
      //session: false,
      successRedirect: '/user',
      failureRedirect: '/'
    })
);

function loginByThirdparty(accessToken, refreshToken, profile) {
  var sql = 'INSERT INTO `users` (`user_id`, `user_pw`, `user_name` ) VALUES ? ON DUPLICATE KEY UPDATE user_id=user_id;';
  //email 가져오는 법 찾을 것
  var values = [[profile._json.id, profile._json.id, profile._json.nickname]];//, kakao_account.email]]; //, profile._json.phone]];
  connection.query(sql, [values], function (err) {
    if (err) {
      console.log("inserting user failed");
      throw err;
    } else {
      console.log("user inserted successfully");
    }
  });
}

router.get('/auth/logout/kakao',function (req,res) {
  req.logout();
  res.redirect('/');
});


router.get('/', function(req, res, next) {
    if(req.isAuthenticated()){
        console.log("(!)이미 로그인");
        res.redirect('/user');
    }else{
        console.log("(!)로그인세션 없음");
        res.redirect('login');
        //res.render('index',{
        //    title: "Dropbox"
        //});
    }
});

/* GET home page.
router.get('/',
    function(req,res,next){
    //카카오 로그인 외에도 방법 필요
      if(req.isAuthenticated()){
        res.redirect('/user');
        console.log("(!)이미 로그인");
      }else{
        console.log("(!)로그인세션 없음");
        res.render('index',{
          title: "Dropbox"
        });
      }
    });*/

module.exports = router;
