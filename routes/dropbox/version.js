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
	S3.getVersionedFileList ('2016104141-test-bucket', req.session.user_id, function(result, list){
		if(result==1){
			console.log("filelist: ");
			console.log(list.Contents);
			res.render('dropbox/version', {verData: list.Contents, path:''});
		}else{
			var data = [{name:"file1"},{name:"file2"},{name:"file3"}];
			res.render('dropbox/version', {verData: data, path:''});
		}
	});    
});

router.post('/restore', function(req,res){
	var params_path='';
	params_path+=req.body.path;
	console.log(params_path);	
	
	//이전 버젼 복원
});

module.exports = router;