var express = require('express');
var request = require('request');
var drive = require('./drive');
var setting = require('./setting');
var users = require('./users');
var router = express.Router();

router.use((req, res, next) => {
    if (req.session.user_id) {
        console.log('(!)이미 로그인1');
    } else {
        console.log('(!)로그인세션 없음1');
        res.redirect('/login');
    }
    next();
});
router.use('/drive', drive);
router.use('/setting', setting);
router.use('/users', users);

module.exports = router;