var express = require('express');
var request = require('request');
var router = express.Router();
var async = require('async');
var trashcan = require('./trashcan');
var version = require('./version');
router.use('/trashcan', trashcan);
router.use('/version', version);
var diff = require('node-jsdifflib');
var formidable = require('formidable');
var S3= require('./../../public/modules/s3/s3.js');
var path = require('path');
var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-2'});

var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
//router.use(express.static('views/dropbox'));
//router.use(express.static('views/dropbox'));
//var multiparty = require('multiparty');
//var multiparty = require('connect-multiparty');
//var multipartyMiddleware = multiparty();
//var multer  = require('multer');
//var upload = multer();

router.get('/', function(req, res) {
	console.log("user_id: ");
	console.log(req.session.user_id);
    //=====================
    var data = [{userName:req.session.user_id, userGroup:"none"}
                ,{name:"file1"},{name:"file2"},{name:"file3"}
                        ,{name:"file4"},{name:"file5"},{name:"file6"}
                        ,{name:"file7"},{name:"file8"},{name:"file9"}
                        ,{name:"file10"},{name:"file11"},{name:"file12"}
                        ,{name:"file13"},{name:"file14"},{name:"file15"}];
    res.render('dropbox/drive',{dropData:data, user_id: req.session.user_id});
/*	S3.getFileList('2016104141-test-bucket', req.session.user_id, '', function(result, list){
		if(result==1){
			console.log("filelist: ");
			console.log(list.Contents);
			res.render('dropbox/drive', {dropData: list.Contents, path:'', numbers:1, user_id: req.session.user_id});
		}else{
			var data = [{name:"file1"},{name:"file2"},{name:"file3"}];
			res.render('dropbox/drive', {dropData: data, path:'', numbers: 1, user_id: req.session.user_id});
		}
	});*/
});
router.post('/getCompare', function (req, res, next) {
    var file1;
    try {
        file1 = fs.readFileSync("/workspace/dropbox/routes/dropbox/test1.txt", "utf8");
    } catch (err) {
        console.log(err);
    }
     var file2;
    try {
        file2 = fs.readFileSync("/workspace/dropbox/routes/dropbox/test2.txt", "utf8");
    } catch (err) {
        console.log(err);
    }

    var output = diff(file1, file2, { baseTextName: "test", newTextName: "new" });
    res.send({data:output});

});
router.get('/share/:team', function(req, res) {
	console.log("user_id: ");
	console.log(req.session.user_id);
    console.log(targetpath=req.params.team);
    var targetpath=req.params.team;
    //=====================
    var data = [{userName:req.session.user_id, userGroup:targetpath}
                ,{name:"file1"},{name:"file2"},{name:"file3"}
                        ,{name:"file4"},{name:"file5"},{name:"file6"}
                        ,{name:"file7"},{name:"file8"},{name:"file9"}
                        ,{name:"file10"},{name:"file11"},{name:"file12"}
                        ,{name:"file13"},{name:"file14"},{name:"file15.txt"}];

    res.render('dropbox/share_drive',{dropData:data});    
});

router.get('/editor/:file', function(req, res) {
	console.log("user_id: ");
	console.log(req.session.user_id);
    console.log(targetpath=req.params.team);
    var targetpath=req.params.team;
    //=====================
    var data = [{userName:req.session.user_id, userGroup:targetpath}
                ,{name:"file1"},{name:"file2"},{name:"file3"}
                        ,{name:"file4"},{name:"file5"},{name:"file6"}
                        ,{name:"file7"},{name:"file8"},{name:"file9"}
                        ,{name:"file10"},{name:"file11"},{name:"file12"}
                        ,{name:"file13"},{name:"file14"},{name:"file15.txt"}];

    res.render('dropbox/share_drive',{dropData:data});    
});

function getflist(cb){
	console.log("getflist!");
	var pyfiles=[];
		var javafiles=[];
		var cppfiles=[];
		var txtfiles=[];
		var jsfiles=[];
		var others=[];
		var folderlist=[];
	S3.getFileList(S3.TEST_BUCKET_NAME, req.session.user_id, '', function(result, list){
		if(result==1){
			console.log(list.Contents);
			var num=1;
			for (i=1; i<list.Contents.length; i++) {
				if(list.Contents[i].Key.slice(-1) == '/'){ //folder
						folderlist.push(list.Contents[i]);
				}else{ //file
					var extension=list.Contents[i].Key.split('.'); //확장자 확인
					if(extension[extension.length-1]=='py'){
						pyfiles.push(list.Contents[i]);
					}else if(extension[extension.length-1]=='java'){
						javafiles.push(list.Contents[i]);
					}else if(extension[extension.length-1]=='txt'){
						txtfiles.push(list.Contents[i]);
					}else if(extension[extension.length-1]=='js'){
						jsfiles.push(list.Contents[i]);
					}else if(extension[extension.length-1]=='cpp'){
						cppfiles.push(list.Contents[i]);
					}else{
						others.push(list.Contents[i]);
					}
				}
				num=num+1;
				if(num==list.Contents.length){
					console.log("flist" ,folderlist);
					console.log("py" ,pyfiles);
					cb(true, folderlist, pyfiles, javafiles, txtfiles, jsfiles,others, cppfiles);
				}
			}
	}else{
		cb(false, null, null,null,null,null,null);
	}
	});
}

router.get('/drive_temp/:user_id', function(req,res) { 
    console.log('drive-temp!');
	if(req.params.user_id == req.session.user_id){// only login user can access
		getflist( function(result,folderlist,pyfiles,javafiles,txtfiles,jsfiles,others, cppfiles){
			if(result==true){
				res.render('dropbox/drive_temp', {folderlist:folderlist, pyfiles:pyfiles, javafiles:javafiles, txtfiles:txtfiles, 						jsfiles:jsfiles, others:others, cppfiles:cppfiles, path:'', user_id: req.session.user_id});	
			}else{
				throw err;
			}
		});
	}else{
		throw err;
	}
});

router.get('/drive_temp/:user_id/:path', function(req,res) {
    console.log('drive-temp-path!');
	if(req.params.user_id==req.session.user_id){ // only login user can access
	var targetpath=req.params.path;
	console.log("key : " + key);
	console.log("targetpath : " + targetpath);
	console.log(":path == " +targetpath);
	S3.getFileList('2016104141-test-bucket', req.session.user_id, targetpath, function(result, list){
		if(result==1){
			var count=targetpath.split('/');
			console.log(count.length);
			res.render('dropbox/drive_temp', {dropData: list.Contents, path:req.params.path, numbers: count.length+1, 							key:req.body.key});
		}else{
			console.log(4);
			var data = [{name:"file1"},{name:"file2"},{name:"file3"}];
			res.render('dropbox/drive_temp', {dropData: data, path:req.params.path, numbers:2, key:''});
		}
		});
	}else{
		console.log("not your path!");
		throw err;
	}
});

router.get('/drive_temp/:user_id/folder', function(req,res) {
    console.log('drive-temp-folder!');
	if(req.params.user_id==req.session.user_id){  // only login user can access
	var key=req.body.key;
	var index=req.indexOf('/');
	var targetpath=key.slice(index);
	console.log("key : " + key);
	console.log("targetpath : " + targetpath);
	console.log(":path == " +targetpath);
	S3.getFileList('2016104141-test-bucket', req.session.user_id, targetpath, function(result, list){
		if(result==1){
			var count=targetpath.split('/');
			console.log(count.length);
			res.render('dropbox/drive_temp', {dropData: list.Contents, path:req.params.path, numbers: count.length+1, key:req.body.key});
		}else{
			console.log(4);
			var data = [{name:"file1"},{name:"file2"},{name:"file3"}];
			res.render('dropbox/drive_temp', {dropData: data, path:req.params.path, numbers:2, key:''});
		}
		});
	}else{
		console.log("not your folder!");
		throw err;
	}
});



router.post('/drive_temp/upload_file',function(req,res){ 
	var post_file = new formidable.IncomingForm(); //save the post file
	console.log(1);
	//console.log("files : " + req.file['upload_file']);
	//console.log("body : " + req.file['upload_file']);
	/*var file = req.files.file;
	console.log("file : " + file);
	var buffer = fs.readFileSync(file.path);
	//console.log("buffer : " + buffer);
	var multipartParams = {
    			Bucket: TEST_BUCKET_NAME,
    			Key:req.session.user_id + '/' +filename,
				ACL:'private',
        		Body: require('fs').createReadStream(file.path)
  			};
	console.log("mp :  " + multipartParams);
	S3.multipartUpload(multipartParams, buffer, function(result){
	  		if(result==1){
				console.log('blah');
				res.redirect('back');
	  		}else{
				console.log("error!");
				throw err;
			}
	});*/
	post_file.parse(req, function(err, fields, files) {
		console.log(2);
		//console.log(files.upload_file.path);
	   var s3 = new AWS.S3({apiVersion:'2006-03-01'});
       var uploadparams = {
            Bucket: TEST_BUCKET_NAME,
            Key:req.session.user_id + '/' + '' +files.upload_file.name,
            ACL:'private',
            Body: fs.createReadStream(files.upload_file.path), 
		   //req.session.user_id + '/' + '' +files.upload_file.name,
		   //require('fs').createReadStream(files.upload_file.path)
       };
	/*	console.log(files.size);
	S3.multipartUpload(multipartParams, files.size, function(result){
	  		if(result==1){
				console.log('blah');
				res.redirect('back');
	  		}else{
				console.log("error!");
				throw err;
			}
	});*/
    s3.upload(uploadparams, function(err, data){
            if(err){
				console.log("err!");
				throw err;
			}
            else{
				console.log("upload succeed!");
				console.log(data);
				res.redirect('/dropbox/drive');
			}
       });
	});
});

router.post('/drive_temp/:path/upload_file', function(req,res){ //path url 구조 생각할것!
	 var post_file = new formidable.IncomingForm(); //save the post file
	console.log(1);
    post_file.parse(req, function(err, fields, files) {
		console.log(2);
		console.log((files.upload_file.name));
	   var s3 = new AWS.S3({apiVersion:'2006-03-01'});
       var uploadparams = {
            Bucket: TEST_BUCKET_NAME,
            Key:req.session.user_id + '/' + req.params.path+'/' +files.upload_file.name,
            ACL:'private',
            Body: require('fs').createReadStream(files.upload_file.path)
       };
       s3.upload(uploadparams, function(err, data){
            if(err){
				console.log("err!");
				throw err;
			}
            else{
				console.log("upload succeed!");
				console.log(data);
				res.redirect('/dropbox/drive');
			}
       });
	});
});

router.post('/drive_temp/createfolder', function(req,res){
	var params_path='';
	params_path+=req.body.foldername;
	console.log(params_path);	
	S3.createPath(S3.TEST_BUCKET_NAME, req.session.user_id, params_path, function(result){
		if(result==1){
			console.log("create path true");
			res.redirect('back');
		}else{
			console.log("create path failed");
			res.redirect('back');
		}
	});
});

router.post('/drive_temp/:path/createfolder', function(req,res){
	var params_path='';
	console.log(req.params.path);
	params_path=req.params.path + '/';
	params_path+=req.body.foldername;
	console.log(params_path);	
	S3.createPath(S3.TEST_BUCKET_NAME, req.session.user_id, params_path, function(result){
		if(result==1){
			console.log("create path true");
			res.redirect('back');
		}else{
			console.log("create path failed");
			res.redirect('back');
		}
	});
});

router.post('/drive_temp/creategroup', function(req,res){
	console.log("create group!");
	var params_path=req.body.foldername;
	useridArray=[]; //form으로 부터 넘겨받기
	console.log(params_path);
	var path_name='group_'+req.session.user_id;
	S3.createPath(S3.TEST_BUCKET_NAME, path_name, params_path, function(result){
		if(result==1){
			console.log("create path true");
			var g_index="";
			//insert group name & acl to groups
			var sql = 'INSERT INTO `groups` (`group_name`, `group_member_total_num`,  `group_access_range`) VALUES=?;';
            var values = [req.body.foldername, 1, acl];
            connection.query(sql, values, function (err) {
                if (err) {
                    console.log("inserting user failed");
                    throw err;
                } else {
					console.log("insert into groups success");
                }
			});
			//get group index
			var sqlquery = "SELECT group_index FROM users WHERE group_name = ?";
  			connection.query(sqlquery,req.body.foldername,function(err,rows){
    			if(!err){
					g_index=rows[0].group_index;
				}else{
					console.log("find group index failed");
					throw err;
				}
			});
			
			var count=0;
			//add logined user as group member
			var sql4 = 'INSERT INTO `group_user_relation` (`group_index`, `group_member_index`) VALUES=?';
            var values4 = [g_index, req.session.user_id];
            connection.query(sql4, values4, function (err) {
                if (err) {
                    console.log("inserting user failed");
                    throw err;
                } else {
					console.log("insert into groups success");
                    count+=1;
                }
			});	
			//add useridArray members
			for (var i=0; i<useridArray; i++){
				var sqlquery2 = "SELECT  * FROM users WHERE user_id = ?";
				var groupmemberid=useridArray[i];
  				connection.query(sqlquery2, groupmemberid , function(err,rows){
    				if(!err){ // check if user is a registered user
      				var sql = 'INSERT INTO `group_user_relation` (`group_index`, `group_member_index`) VALUES=?';
                	var values = [g_index, groupmemberid];
                	connection.query(sql, values, function (err) {
                    	if (err) {
                        	console.log("inserting user failed");
                    	} else {
							console.log("insert into groups success");
                        	count+=1;
                    		}
						});	
    				} else {
      					console.log("내 정보를 가져오는데 실패했습니다!");
						throw err;
    				}
  				});
			}
			//update group total num
			var sql3='UPDATE groups SET group_total_num = ? WHERE group_index = ?';
        	var values2=[count, g_index];
        	connection.query(sql3, values2 , function (err) {
          		if (err) {
            		console.log("updating user failed");
					throw err;
          		} else {
            		console.log("group total num inserted");
			  		res.redirect('back');
         		}
        	});
		}else{
			console.log("create group failed");
			throw err;
		}
	});
});

router.post('/drive_temp/deleteobject', function(req,res){
	console.log(req.body.key);
	console.log(req.body.params_body);
	if(req.body.key.slice(-1)=="/"){ //delete folder
		console.log("delete folder");
		var folder_key=req.body.key.slice(req.session.user_id.length +1);
		console.log("folder key : " +folder_key);
		S3.deletePath(S3.TEST_BUCKET_NAME,req.session.user_id, folder_key, function(result){
			if(result==1){
				console.log("delete succeed");
				res.redirect('back');
			}else{
				console.log("delete failed");
				res.redirect('back');
			}
		});
	}
	else{ 
		console.log("delete file");
		var file_key=req.body.key.slice(req.session.user_id.length +1);
		S3.deleteFile(S3.TEST_BUCKET_NAME, req.session.user_id, file_key, function(result){
			if(result==1){
				console.log("delete succeed");
				res.redirect('back');
			}else{
				console.log("delete failed");
				res.send('failed');
				res.redirect('back');
			}
		});
	}
});

router.post('/drive_temp/:path/deleteobject', function(req,res){
	console.log(req.body.key);
	console.log(req.params.path);
	if(req.body.key.slice(-1)=="/"){ //delete folder
		console.log("delete folder");
		var folder_key=req.body.key.slice(req.session.user_id.length +1);
		console.log("folder key" +folder_key);
		S3.deletePath(S3.TEST_BUCKET_NAME,req.session.user_id, folder_key, function(result){
			if(result==1){
				console.log("delete succeed");
				res.redirect('back');
			}else{
				console.log("delete failed");
				res.send('failed');
				res.redirect('back');
			}
		});
	}
	else{ 
		console.log("delete file");
		var file_key=req.body.key.slice(req.session.user_id.length +1);
		S3.deleteFile(TEST_BUCKET_NAME, req.session.user_id, file_key, function(result){
			if(result==1){
				console.log("delete succeed");
				res.redirect('back');
			}else{
				console.log("delete failed");
				res.send('failed');
				res.redirect('back');
			}
		});
	}
});

router.post('/drive_temp/:path/upload_file', function(req,res){ //path url 구조 생각할것!
	 var post_file = new formidable.IncomingForm(); //save the post file
	console.log(1);
    post_file.parse(req, function(err, fields, files) {
		console.log(2);
		console.log((files.upload_file.name));
	   var s3 = new AWS.S3({apiVersion:'2006-03-01'});
       var uploadparams = {
            Bucket: S3.TEST_BUCKET_NAME,
            Key:req.session.user_id + '/' + req.params.path+'/' +files.upload_file.name,
            ACL:'private',
            Body: require('fs').createReadStream(files.upload_file.path)
       };
       s3.upload(uploadparams, function(err, data){
            if(err){
				console.log("err!");
				throw err;
			}
            else{
				console.log("upload succeed!");
				console.log(data);
				res.redirect('/dropbox/drive');
			}
       });
	});
});

router.post('/drive_temp/download', function(req,res){
	console.log("key : " + req.body.key);
	var index=req.body.key.indexOf('/');
	console.log(index);
	var params_path=req.body.key.slice(index+1);
	console.log(params_path);
	
	S3.downloadFile(S3.TEST_BUCKET_NAME, req.session.user_id, params_path, function(result){
		if(result==1){
			console.log("download file succeed");
		}else{
			console.log("create path failed");
		}
	});
	res.redirect('back');
});


router.post('/drive_temp/move', function(req,res){
	S3.moveFile(bucketName, userId, sourceFile, targetPath, function(result) {
		if(result==true){
			console.log("movefile succeed!");
		}else{
			console.log("movefile failed!");
		}
	
	});
});

module.exports = router;