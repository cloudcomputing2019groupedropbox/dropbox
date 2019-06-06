
var express = require('express');
var request = require('request');
var router = express.Router();
var async = require('async');

var S3= require('./../../public/modules/s3/s3_dev.js');
var path = require('path');
var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-2'});

var TEST_BUCKET_NAME='2016104141-test-bucket';

router.get('/', function(req,res) {
    console.log('trashcan!');
	S3.getDisposedFileList ('2016104141-test-bucket', req.session.user_id, function(result, list){
		if(result==1){
			console.log("filelist: ");
			console.log(list.Contents);
			res.render('dropbox/trashcan', {delData: list.Contents, path:''});
		}else{
			var data = [{name:"file1"},{name:"file2"},{name:"file3"}];
			res.render('dropbox/trashcan', {delData: data, path:''});
		}
	});    
});

router.post('/restore', function(req,res){
	var params_path='';
	params_path+=req.body.path;
	console.log(params_path);	
	
	S3.returnDisposedFile(TEST_BUCKET_NAME, req.session.user_id, params_path, function(result){
		if(result==1){
			console.log("restore file succeed");
			res.redirect('back');
		}else{
			console.log("restore file failed");
			res.redirect('back');
		}
	});
});


module.exports = router;


