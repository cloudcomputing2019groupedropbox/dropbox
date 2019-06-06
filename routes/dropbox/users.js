var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.render('dropbox/user',{dropData: null});
});

module.exports = router;