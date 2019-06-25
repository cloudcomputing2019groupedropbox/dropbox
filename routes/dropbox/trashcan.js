
var express = require('express');
var request = require('request');
var router = express.Router();
var async = require('async');
var cryptoM = require('./../../public/modules/cryptoM.js'); //drive.js랑 똑같이 했어요
var S3= require('./../../public/modules/s3/s3.js');
var path = require('path');
var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-2'});


router.get('/', function(req,res) {
    console.log('trashcan!');
	console.log(req.session.user_id);
	S3.getDisposedObjectList (S3.TEST_BUCKET_NAME,req.session.user_id, function(result, list){
		if(result==1){
			console.log("filelist: ");
			console.log(list.Contents);
			res.render('dropbox/trashcan', {user_id:req.session.user_id,delData: list.Contents});
		}else{
			var data = [{name:"file1"},{name:"file2"},{name:"file3"}];
			res.render('dropbox/trashcan', {user_id:req.session.user_id,delData: data});
		}
	});    
});

router.post('/restore', function(req,res){
	console.log(1);
	var path=req.body.path;
	console.log("path: ", path);
	
	S3.returnDisposedFile(S3.TEST_BUCKET_NAME, req.session.user_id, req.body.path, function(result){
		if(result==1){
			console.log("restore file succeed");
			res.redirect('/dropbox/drive/trashcan');
		}else{
			console.log("restore file failed");
			res.redirect('/dropbox/drive/trashcan');
		}
	});
});

router.post('/delete', function(req,res){
	var path=req.body.path;
	if(path.slice(-1)=="/"){ //delete folder
		console.log("delete folder");
	S3.deletePath(S3.TEST_BUCKET_NAME, req.session.user_id, path, function(result){ //수정예정
		if(result==1){
			console.log("restore file succeed");
			res.redirect('/dropbox/drive/trashcan');
		}else{
			console.log("restore file failed");
			res.redirect('/dropbox/drive/trashcan');
		}
	});
	}else{
	S3.deleteDisposedFile(S3.TEST_BUCKET_NAME, req.session.user_id, path, function(result){
			if(result==1){
				console.log("delete succeed");
				res.redirect('/dropbox/drive/trashcan');
			}else{
				console.log("delete failed");
				res.send('failed');
				res.redirect('/dropbox/drive/trashcan');
			}
		});
	}
});
module.exports = router;


