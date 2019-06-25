var express = require('express');
var request = require('request');
var router = express.Router();
var async = require('async');

var Group = require('./group');
var trashcan = require('./trashcan');
var version = require('./version');
router.use('/trashcan', trashcan);
router.use('/version', version);

var diff = require('node-jsdifflib');
var formidable = require('formidable');
var S3= require('./../../public/modules/s3/s3.js');
var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-2'});
var cryptoM = require('./../../public/modules/cryptoM.js');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
const readline = require('readline');

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,""); 
};

function getversionedfilesarray(userid, targetfile, callback){
	S3.isVersionedFile(S3.TEST_BUCKET_NAME, userid, targetfile, function(r,ans, num){
		if(ans==true){
				console.log(list.Contents[i]);
				callback(true);
		}else{
			callback(false);
		}
	});
}

function getversionedfiles(userid, group_index, group_name, callback){
	var versionedfiles=[];
	 Group.isgroupmember(userid, group_index, function(result, leader){
		if(result==true){
			console.log("leader : ", leader);
			S3.getVersionedFileList(S3.TEST_BUCKET_NAME, leader, group_name, function(result, list){
				if(result==1){
					var count=0;
					console.log("contents : " , list.Contents);
					for (i=0; i<list.Contents.length; i++) {
							var key=list.Contents[i].Key;
							var split=key.split('.');
							var targetpath='';
							console.log("filename : ", split[0]);
							var hasduplicate=0;
							for (j=0; j<versionedfiles.length; j++){
								if(versionedfiles[j][0]==split[0]){
									hasduplicate=1;
								}
							}
							if(hasduplicate==0){
								var info=[];
								info.push(split[0]);
								info.push(list.Contents[i].Key);
								info.push(leader);
								info.push(group_name);
								info.push(i);
								versionedfiles.push(info);
							}
							count=count+1;
					}
					console.log("vf : "  ,versionedfiles);
					if(count==list.Contents.length){
						callback(true, versionedfiles);	
					}
				
		}else{
			callback(false, versionedfiles);
		}
	});
		}else{
			res.redirect('back');	
		}
	 });
}

function downloadshowfile(dpath, callback){
	S3.downloadFile2(S3.TEST_BUCKET_NAME, req.session.user_id, dpath, function(result, data){ 
		if(result==1){
			console.log("download file succeed");
			var dir='./views/download/'+req.session.user_id+'/'+dpath;
			console.log(dir);
			try{
				fs.writeFileSync(dir, data);
			}catch(err){
				callback(false);
			}finally{
				callback(true);	
			}
		}
	});
}
//채팅창 버젼이 있는 파일 목록들
router.post('/share/:group_index/:group_name/getversionedfilelist',function (req, res, next) {
	getversionedfiles(req.session.user_id , req.params.group_index, req.params.group_name, function(result, array){
		if(result==true){
			console.log("array",array);
			//res.send({vfiles:array});
		res.send({vfiles:array});
		}else{
			res.send({vfiles:[]});
		}
	});
});
//선택한 파일 버젼 리스트
router.post('/getHistory', function (req, res, next) {
    console.log(11);
     console.log(req.body.test);
    console.log(req.body.fileinfo);
    
	var fileinfo=req.body.fileinfo.split(',');
	//console.log("filename : ", fileinfo);
	
	/*var dpath="";
		if(r !=''){
			console.log(2);
			var decryptpath=cryptoM.decrypt(req.params.path);
			decryptpath=decryptpath.toString();
			dpath=decryptpath.substring(1);		
			dpath=dpath+"/"+req.body.filename;
			console.log("decrpytpath : " + dpath);
		}else{
			console.log(3);
			dpath=req.body.filename;
		}
		console.log("dpath : ", dpath);
	*/
	console.log("2 : " ,fileinfo[2]);
	console.log("3 : " ,fileinfo[3]);
		S3.getVersionedFileList(S3.TEST_BUCKET_NAME, fileinfo[2], fileinfo[3], function(result, data) { //latest: drive folder에 있는 아이
			if(result==true){
				console.log(data.Contents);
				res.send({verData:data.Contents, leader:fileinfo[2]});
			}else{
				//res.render('back');
			}
		});		
		
});

function readfile(targetpath, name, callback){
	    var file1;
	try {
   //     file1 = fs.readFileSync("/workspace/dropbox/routes/dropbox/test1.txt", "utf8");
		file1 = fs.readFileSync("./views/download/"+targetpath+"_"+name[1], "utf8");
    } catch (err) {
        console.log(err);
    }
     var file2;
    try {
       // file2 = fs.readFileSync("/workspace/dropbox/routes/dropbox/test2.txt", "utf8");
        file2 = fs.readFileSync('./views/download/'+targetpath, "utf8");
    } catch (err) {
        console.log(err);
    }
	finally{
		callback(true, file1,file2);
	}
	
}
//버젼 리스트중 선택한 버젼과 최근것 비교
router.post('/getCompare', function (req, res, next) {
	console.log("getCompare!");
	var version=req.body.old;
	console.log(version);
	var name=version.split('_');
	console.log(name);
	var targetpath=name[0].substring(16);
	console.log("tp : " ,targetpath);
	S3.downloadVersionedFile(S3.TEST_BUCKET_NAME, req.body.leader, version, function(result, data){
		if(result==1){
			console.log("download file succeed");
			var downloaddir='./views/download/'+targetpath+"_"+name[1];
			fs.writeFileSync(downloaddir, data);
		}
	});
	
	S3.downloadFile3(S3.TEST_BUCKET_NAME, targetpath, function(result, data){
		if(result==1){
			console.log("download file succeed");
			var downloaddir='./views/download/'+targetpath;
			fs.writeFileSync(downloaddir, data);
		}
	});
	readfile(targetpath, name,function(result, file1,file2){
		if(result==true){
    		var output = diff(file1, file2, { baseTextName: "test", newTextName: "new" });
    		res.send({data:output});
		}else{
			throw err;
		}
	});
	
    /*try {
        //file1 = fs.readFileSync("/workspace/dropbox/routes/dropbox/test1.txt", "utf8");
		file1 = fs.readFileSync(version, "utf8");
    } catch (err) {
        console.log(err);
    }
     var file2;
    try {
        file2 = fs.readFileSync(latest, "utf8");
    } catch (err) {
        console.log(err);
    }
	var dpath;
    		var output = diff(file1, file2, { baseTextName: "test", newTextName: "new" });
    		res.send({data:output});	*/
});

router.get('/share/:group_index/share_editor/editor/:file', function(req, res) {
	console.log("user_id: ");
	console.log(req.session.user_id);
	var dpath;
	/*if(req.params.path!=''){
	var decryptpath=cryptoM.decrypt(req.params.path);
	decryptpath=decryptpath.toString();
	dpath=decryptpath.substring(1);		
	}
	var downloaddir="";
	var path=dpath;
	path=path.substring(3);
	console.log("decrpytpath : " + dpath);
	console.log("path : " + path);*/
	/*Group.isgroupmember(req.session.user_id, req.params.group_index, function(result, leader){
		if(result==true){
			Group.getgroupname(req.params.group_index, function(result,groupname){
				if(result==true){
					S3.downloadFile2(S3.TEST_BUCKET_NAME, leader,groupname , function(result, data){
					if(result==1){
						console.log("download file succeed");
						downloaddir='./views/download/'+leader+"/"+groupname+"/"+req.params.file;
						fs.writeFileSync(downloaddir, data);
						var file1 = fs.readFileSync(downloaddir, "utf8");
						 console.log(file1);
    					res.render('dropbox/edit_file',{editData:file1}); 
					}
				});
			}
			});
		}
	});*/
		
    try {
        file1 = fs.readFileSync("/workspace/dropbox/routes/dropbox/test1.txt", "utf8");
    } catch (err) {
        console.log(err);
    }
    //=====================
    var data = {
        userName:req.session.user_id, 
        userGroup:req.params.group_index,
        fileStr:file1,
        filePath:"/workspace/dropbox/routes/dropbox/test1.txt"
        };
    console.log(data.fileStr);
    res.render('dropbox/edit_file',{editData:data});   
	/*}else{
			res.redirect('back');
	}
	
		}	
	})
*/	
});

router.post('/share/upload_file', function(req,res){
	var post_file = new formidable.IncomingForm(); //save the
    post_file.parse(req, function(err, fields, files) {
		console.log((files.upload_file.name));
		var dpath;
		var fieldspath=fields['path'];
		console.log("fieldspath : " ,fieldspath);
		var arr=fieldspath.split('/');
		console.log(arr);
			var pathurl;
			if(arr.length==3)
			{
				pathurl=fieldspath;
				var m=pathurl.split('/');
				console.log("m : " ,m);
				dpath=m[2];
			}else{
				pathurl=arr[arr.length-1];
				dpath=cryptoM.decrypt(pathurl);
				dpath=req.body.group_name+dpath;
				console.log("path : ", pathurl);
			}
		console.log("dpath" + dpath);
		var url='/dropbox/drive/share'+fieldspath;
		console.log("filename : ", files.upload_file.name);
	  Group.isgroupmember(req.session.user_id, arr[1], function(result, leader){
		if(result==true){
			console.log("leader : ", leader);
			console.log(files.upload_file.name);
		S3.uploadFile(S3.TEST_BUCKET_NAME, leader, files.upload_file.name, dpath, files.upload_file.path, function(result){
			if(result==1){
				console.log("upload succeed!");
				res.redirect(url);
			}else{
				console.log("err!");
				res.redirect(url);
			}
		});
	  }else{
			res.redirect('/login/');
		}
	});
});
});


router.post('/share/:group_index/:group_name/createfolder', function(req,res){
	console.log("createfolderin group!");
	var foldername=req.body.foldername;
	console.log(foldername);
	if(foldername!=""){
	var path=req.body.path;
	console.log('path', path);
	var params_path;
	var count=path.split('/');
		
	if(count.length>3){
		var encryptpath=cryptoM.decrypt(path);
		encryptpath=encryptpath.substring(1);
		params_path=encryptpath+"/"+foldername;
	}else{
		params_path=foldername;
	}
		params_path=req.params.group_name+'/'+params_path;
	console.log('params_path : ',params_path);
	var url='/dropbox/drive/share/'+req.params.group_index+'/'+req.params.group_name;
	  Group.isgroupmember(req.session.user_id, req.params.group_index, function(result, leader){
		if(result==true){
		S3.createPath(S3.TEST_BUCKET_NAME, leader, params_path, function(result){
			if(result==1){
				console.log("create path true");
				res.redirect(url);
			}else{
				console.log("create path failed");
				throw err;
			}
		});
		}else{
		console.log("no name!!");
		res.redirect('back');
		}
	  });
	  }else{throw err;}
});

//getfilelist and sort by extension
function getflist(user_id, path, cb){
	console.log("getflist!");
	S3.getFileList(S3.TEST_BUCKET_NAME, user_id, path, function(result, list){
		if(result==1){
		var pyfiles=[];
		var javafiles=[];
		var cppfiles=[];
		var txtfiles=[];
		var jsfiles=[];
		var images=[];
		var others=[];
		var folderlist=[];
		var targetpath="";
		if(path!=''){
			targetpath='drive/'+user_id +"/"+path;		
		}else{
			targetpath='drive/'+user_id;
		}
			targetpath=targetpath.replace('//','/');
		console.log("tpath ", targetpath);
		var arr=targetpath.split('/');
		console.log("arr" , arr);
		console.log("Contents : " ,list.Contents);
		console.log("l : " ,list.Contents.length);
		var num=1;
			for (i=0; i<list.Contents.length; i++) {
				var count=list.Contents[i].Key.split('/');
				if(list.Contents[i].Key.slice(-1) == '/'){ //folder
					console.log("countlen : "+ count.length);
					if(count.length==arr.length+2){
						folderlist.push(list.Contents[i]); //현재 경로에 있는 폴더만 보이기
					}
				}else{ //file
					count=list.Contents[i].Key.split('/');
					console.log("countlen : "+ count.length);
				  if(count.length==arr.length+1){
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
					}else if(extension[extension.length-1]=='jpeg' || extension[extension.length-1]=='jpg ' || extension[extension.length-1]=='png'){
						images.push(list.Contents[i]);
					}
					  else{
						others.push(list.Contents[i]);
					}
				  }
				}
				num=num+1;
				if(num>=list.Contents.length){
					console.log(images);
					cb(true, folderlist, pyfiles, javafiles, txtfiles, jsfiles, others, cppfiles, images);
				}
			}	
			if(list.Contents.length==0){
				cb(true, folderlist, pyfiles, javafiles, txtfiles, jsfiles, others, cppfiles, images);
			}
	}else{
		cb(false, null, null,null,null,null,null);
	}
	});
}
//drive.ejs
router.get('/:user_id', function(req,res) { 
    console.log('drive-temp!');
	if(req.params.user_id == req.session.user_id){// only login user can access
		console.log("userid : " + req.session.user_id);
		getflist(req.params.user_id,'', function(result,folderlist,pyfiles,javafiles,txtfiles,jsfiles,others, cppfiles, images){
			if(result==true){
				Group.getgroupinfo(req.params.user_id, function(result, groupfolders){
					if(result==true){
						 var data = [{userName:req.session.user_id, userGroup:"none"},{name:"file1", type:"folder"}];
							res.render('dropbox/drive', {pathEnc:"",dropData:data,folderlist:folderlist, pyfiles:pyfiles, javafiles:javafiles, 
															  txtfiles:txtfiles,jsfiles:jsfiles, others:others, cppfiles:cppfiles, 
															  path:'', user_id: req.session.user_id, groupfolders: groupfolders, images:images});	
					}else{throw err;}
				});
				}else{throw err;}
		});
	}else{throw err;}
});
//inside folder
router.get('/:user_id/:path', function(req,res) {
    console.log('drive-temp-path!');
	if(req.params.user_id==req.session.user_id){ // only login user can access
	var decryptpath=cryptoM.decrypt(req.params.path);
	var dpath=decryptpath.toString();
		dpath=dpath.replace('//','/');
		console.log("dpath : ", dpath);
	dpath=decryptpath.substring(1, decryptpath.length-1);		
	console.log("decrpytpath : " + dpath);
	getflist(req.params.user_id, dpath, function(result,folderlist,pyfiles,javafiles,txtfiles,jsfiles,others, cppfiles, images){
			if(result==true){
				Group.getgroupinfo(req.params.user_id, function(result, groupfolders){
					if(result==true){
				 var data = [{userName:req.session.user_id, userGroup:"none"}
                ,{name:"file1", type:"folder"},{name:"file2", type:"folder"}];
				res.render('dropbox/drive', {pathEnc:req.params.path,dropData:data,folderlist:folderlist, pyfiles:pyfiles, javafiles:javafiles, 
															  txtfiles:txtfiles,jsfiles:jsfiles, others:others, cppfiles:cppfiles, 
															  path:"/"+dpath, user_id: req.session.user_id, groupfolders: 																	groupfolders, images:images});	
					}else{throw err;}
				});
			}else{
				res.redirect('back');
			}
	});
	}else{
		throw err;
	}	
});
//drive_temp
router.get('/drive_temp/drive_temp/:user_id', function(req,res) { 
    console.log('drive-temp!');
	if(req.params.user_id == req.session.user_id){// only login user can access
		console.log("userid : " + req.session.user_id);
		getflist(req.params.user_id,'', function(result,folderlist,pyfiles,javafiles,txtfiles,jsfiles,others, cppfiles, images){
			if(result==true){
				Group.getgroupinfo(req.params.user_id, function(result, groupfolders){
					if(result==true){
						 var data = [{userName:req.session.user_id, userGroup:"none"},{name:"file13"},{name:"file14"},{name:"file15"}];
    //res.render('dropbox/drive',{dropData:data, user_id: req.session.user_id});
							res.render('dropbox/drive_temp', {dropData:data,folderlist:folderlist, pyfiles:pyfiles, javafiles:javafiles, 
															  txtfiles:txtfiles,jsfiles:jsfiles, others:others, cppfiles:cppfiles, 
															  path:'', user_id: req.session.user_id, groupfolders: groupfolders, images:images});	
					}else{throw err;}
				});
				}else{throw err;}
		});
	}else{throw err;}
});
//drive_temp inside
router.get('/drive_temp/:user_id/:path', function(req,res) {
    console.log('drive-temp-path!');
	if(req.params.user_id==req.session.user_id){ // only login user can access
	var decryptpath=cryptoM.decrypt(req.params.path);
	decryptpath=decryptpath.toString();
	var dpath=decryptpath.substring(1);		
	console.log("decrpytpath : " + dpath);
	getflist(req.params.user_id, dpath, function(result,folderlist,pyfiles,javafiles,txtfiles,jsfiles,others, cppfiles, images){
			if(result==true){
				console.log(-1);
				Group.getgroupinfo(req.params.user_id, function(result, groupfolders){
					if(result==true){
				 var data = [{userName:req.session.user_id, userGroup:"none"}
                ,{name:"file1", type:"folder"},{name:"file2", type:"folder"}];
				res.render('dropbox/drive_temp', {dropData:data,folderlist:folderlist, pyfiles:pyfiles, javafiles:javafiles, 
															  txtfiles:txtfiles,jsfiles:jsfiles, others:others, cppfiles:cppfiles, 
															  path:req.params.path, user_id: req.session.user_id, groupfolders: 																	groupfolders, images:images});	
					}else{throw err;}
				});
			}else{
				res.redirect('back');
			}
	});
	}else{
		throw err;
	}	
});

router.get('/share/:group_index/:group_name', function(req,res) {
    console.log('drive-group!');
	Group.isgroupmember(req.session.user_id, req.params.group_index, function (result, leader){
		if(result==true){
			console.log(9999992);
		Group.getgroupinsidelist(req.params.group_name, leader, function(result,folderlist,pyfiles,javafiles,txtfiles,jsfiles,others, cppfiles, images){
			if(result==true){
				console.log(1231214432);
				 var data = [{userName:req.session.user_id, userGroup:req.params.group_name, group_index : req.params.group_index}];
				res.render('dropbox/share_drive', {dropData:data,folderlist:folderlist, pyfiles:pyfiles, javafiles:javafiles, txtfiles:txtfiles, jsfiles:jsfiles, others:others, cppfiles:cppfiles, path:"/"+req.params.group_index+"/"+req.params.group_name, user_id: req.session.user_id, groupfolders:[], images:images, pathEnc:''});	
			}else{
				throw err;
			}
		});
	}else{
		res.redirect('/');
		}
	});
});

router.get('/share/:group_index/:group_name/:path', function(req,res) {
    console.log('drive-group-path!');
	Group.isgroupmember(req.session.user_id, req.params.group_index, function (result, leader){
		if(result==true){
			var decrpytpath=''; var dpath='';
			console.log("path : ", req.params.path);
			if(req.params.path!='' && req.params.path!='txt_icon.png'){
				decryptpath=cryptoM.decrypt(req.params.path);
				decryptpath=decryptpath.toString();
				dpath=decryptpath.substring(1);
			}
		console.log("decrpytpath : " + dpath);
		Group.getgroupinsidelist(dpath, leader, function(result,folderlist,pyfiles,javafiles,txtfiles,jsfiles,others, cppfiles, images){
			if(result==true){
				 var data = [{userName:req.session.user_id, userGroup:req.params.group_name,  group_index : req.params.group_index}];
				res.render('dropbox/share_drive', {dropData:data,folderlist:folderlist, pyfiles:pyfiles, javafiles:javafiles, txtfiles:txtfiles, 						jsfiles:jsfiles, others:others, cppfiles:cppfiles, path:req.params.path, user_id: req.session.user_id, groupfolders:[], images:images, pathEnc:req.params.path});	
			}else{
				throw err;
			}
		});
	}else{
		res.redirect('/');
		}
	});
});

function rendershowfile(showfile,callback){
	if(showfile!=null){
	callback(true);
	}else{
		callback(false);
	}
}

//showfile
router.get('/drive_edit/showfile/test/test', function(req,res) {
    console.log('drive-temp-file!');
	console.log(1);
    var dpath;
	console.log("filename : ", req.query.filename);
    console.log(2);
    console.log("path : ", req.query.path);
	console.log(5);// only login user can access
	if(req.query.path !=''){
		console.log(2);
		var decryptpath=cryptoM.decrypt(req.params.path);
		decryptpath=decryptpath.toString();
		dpath=decryptpath.substring(1);		
		dpath=dpath+"/"+req.query.filename;
		console.log("decrpytpath : " + dpath);
	}else{
		console.log(3);
		dpath=req.query.filename;
	}
		S3.downloadFile2(S3.TEST_BUCKET_NAME, req.session.user_id, dpath, function(result, data){
		if(result==1){
			console.log("download file succeed");
			var extension=req.query.filename.split('.');
			var downloaddir='./views/download/'+req.session.user_id+'/'+req.query.filename;
			fs.writeFileSync(downloaddir, data);
			console.log("downloaddir" ,downloaddir);
			console.log(extension);
			console.log("ext : ", extension[extension.length-1]);
			if(extension[extension.length-1]=='jpg' || extension[extension.length-1]=='jpeg' || extension[extension.length-1]=='png')
			{
				console.log(-1);
				rendershowfile(downloaddir, function(result){
					if(result==true){
						console.log(-2);
						var src=downloaddir.substring(8);
						res.render('dropbox/showfile', {showfile: [], image:src});		
					}else{
						res.render('back');
					}
				});
				
			}else{
			const readInterface = readline.createInterface({  
    			input: fs.createReadStream(downloaddir),
    			output: process.stdout,
    			console: false
			});
			var showfile=[];
			readInterface.on('line', function(line) {  
    			showfile.push(line);
			});
			readInterface.on('close', ()=>{
				console.log("sf : ",showfile);
				rendershowfile(showfile, function(result){
					if(result==true){
						res.render('dropbox/showfile', {type:req.query.type,showfile: showfile, image:''});
					}else{
                        console.log(2);
						res.render('back');
					}
				});
			});
			}
		}else{
			console.log("create path failed");
		}
	});
});
//upload
router.post('/drive_temp/upload_file', function(req,res){
	var post_file = new formidable.IncomingForm(); //save the post file
    post_file.parse(req, function(err, fields, files) {
		console.log((files.upload_file.name));
		var fieldspath=fields['path'];
		console.log(fieldspath);
		var arr=fieldspath.split('/');
		console.log(arr);
		var dpath;
		if(arr.length>4){
		var pathurl=arr[arr.length-1];
		console.log("path : ", pathurl);
			dpath=cryptoM.decrypt(pathurl);
			dpath=dpath.substring(1, dpath.length-1);
		}else{
			dpath="";
		}
		//dpath=dpath+"/"+files.upload_file.name;
		console.log("dpath" + dpath);
	   var s3 = new AWS.S3({apiVersion:'2006-03-01'});
		var url="/dropbox/drive/"+req.session.user_id;
		console.log("upname",files.upload_file.name);
		console.log("dpath", dpath);
		S3.uploadFile(S3.TEST_BUCKET_NAME, req.session.user_id, files.upload_file.name, dpath, files.upload_file.path, function(result){
			if(result==1){
				console.log("upload succeed!");
				res.redirect('back');
			}else{
				console.log("err!");
				res.redirect(url);
			}
		});
	});
});


router.post('/drive_temp/createfolder', function(req,res){
	console.log("createfolder!!!");
	var foldername=req.body.foldername;
	console.log(req.body.foldername);
	if(foldername!=""){
	var path=req.body.path;
	console.log('path', path);
	var count=path.split('/');
	var params_path;
	console.log("cl : ", count);
	if(count.length==5){
		console.log("-2", count[count.length-1]);
		var encryptpath=cryptoM.decrypt(count[count.length-1].toString());
		console.log(encryptpath);
		encryptpath=encryptpath.substring(1);
		params_path=encryptpath+"/"+foldername;
	}else{
		params_path=foldername;
	}
	console.log('params_path : ', params_path);
	S3.createPath(S3.TEST_BUCKET_NAME, req.session.user_id, params_path, function(result){
		if(result==1){
			console.log("create path true");
			res.redirect('/dropbox/drive/'+req.session.user_id);
		}else{
			console.log("create path failed");
			throw err;
		}
	});
	}else{
		console.log("no name!!");
		res.redirect('back');
	}
});


router.post('/drive_temp/creategroup', function(req,res){
	console.log("create group!");
	
	var foldername=req.body.foldername;
	var users = req.body.userlist;
	var userArray = users.split(",");
	for(let i = 0; i < userArray.length; i++) {
			userArray[i] = userArray[i].trim();
	}
	console.log(req.body);
	console.log(foldername);
	console.log(userArray);
	userArray.push(req.session.user_id);
	console.log(userArray);
	 Group.creategroup(foldername, req.session.user_id, userArray, function(result, url){
	 	if(result==true){
	 		S3.createPath(S3.TEST_BUCKET_NAME, req.session.user_id,foldername, function(result){
	 			if(result==1){
	 				var url="/dropbox/drive/"+req.session.user_id;
	 				res.redirect(url);	
	 			}
	 		});
	 	}
	 });
});

router.post('/drive_temp/deleteobject', function(req,res){
	console.log("DELETE OBJECT!!!");
	console.log(req.body.filename);
	console.log(req.body.key);
	var path=req.body.path;
	console.log("path : " , path);
	var encryptpath='';
	/*if(path!=''){
		encryptpath=cryptoM.decrypt(path);
		encryptpath=encryptpath+"/"+req.body.filename;
	}
	else{
		encryptpath=req.body.filename;
	}*/
	var url="/dropbox/drive/"+req.session.user_id;
	console.log("enc" + encryptpath);
	if(req.body.path.slice(-1)=="/"){ //delete folder
		console.log("delete folder");
		/*var folder_key=req.body.key.slice(req.session.user_id.length +1);
		console.log("folder key : " +folder_key);*/
		//encryptpath=encryptpath+'/';
		S3.disposePath(S3.TEST_BUCKET_NAME,req.session.user_id, path, function(result){
			if(result==1){
				console.log("delete succeed");
				
				res.redirect(url);
			}else{
				console.log("delete failed");
				res.redirect(url);
			}
		});
	}
	else{ 
		console.log("delete file");
		S3.disposeFile(S3.TEST_BUCKET_NAME, req.session.user_id, path, function(result){
			if(result==1){
				console.log("delete succeed");
				res.redirect(url);
			}else{
				console.log("delete failed");
				res.send('failed');
				res.redirect(url);
			}
		});
	}
});

router.post('/drive_temp/download', function(req,res){ // S3 downloadfile dir 바꿀예정 but 성공!
	var path=req.body.path;
	var encryptpath;
	var params_path;
	console.log("DOWNLODADD");
	console.log("path : ",path);
	var count=path.split('/');
	console.log(count);
	/*if(count.length>4){
		encryptpath=cryptoM.decrypt(path);
		params_path=encryptpath+"/"+req.body.filename;
	}else{
		params_path=req.body.filename;
	}
	console.log(params_path);*/
	S3.downloadFile(S3.TEST_BUCKET_NAME, req.session.user_id, path, function(result, data){
		if(result==1){
			console.log("download file succeed");
			var downloaddir=__dirname+"/"+path;
			console.log(downloaddir);
		//	try{
				fs.writeFileSync(downloaddir, data, function(err){
					if(!err) {
					   res.sendFile(path, { root: path.join(__dirname, '')});
						//res.sendFile(downloaddir);
					}
				});
		//	}/*finally
			//	console.log("dir : ",downloaddir);
			//	console.log("__DIR : ", __dirname); 
			//	res.sendFile(downloaddir);
			//res.sendFile(downloaddir,  function(err){
				
			//});
			//}
		}else{
			console.log("create path failed");
			
		}
	});
	res.redirect('back');
});


router.post('/drive_temp/move', function(req,res){
	console.log("MOVE FILE!!!");
	console.log("req sf: " ,req.body.sourceFile);
	console.log("req tp: " , req.body.targetPath);
	var len=req.session.user_id.toString();
	len=len.length;
	console.log("len : ", len);
	var tp=req.body.targetPath.substring(7+len,req.body.targetPath.length-1);
	console.log("tp: ", tp);
	var sourceFile = req.body.sourceFile.substring(7+len,req.body.sourceFile.length);
	console.log("sf: ", sourceFile);
	/*var index=tp.indexOf('/');
	
	console.log(index);
	var f=tp.substring(parseInt(index));
	console.log(f);
	var indx=f.indexOf('/');
	var n=f.substring(parseInt(indx));
	console.log("n : ", n);*/
	S3.moveFile(S3.TEST_BUCKET_NAME, req.session.user_id,sourceFile, tp, function(result) {
		if(result==true){
			console.log("movefile succeed!");
		}else{
			console.log("movefile failed!");
		}
	});
});


router.post('/drive_temp/movefolder', function(req,res){
	console.log("MOVE!!!");
	console.log("sf: " ,req.body.sourceFile);
	console.log("tp: " , req.body.targetPath);
	var sf=req.body.sourceFile.split('/');
	console.log("sourceFILE: " , sf[sf.length-1]);
	S3.movePath(S3.TEST_BUCKET_NAME, req.session.user_id, sf[sf.length-1], req.body.targetPath, function(result) {
		if(result==true){
			console.log("movefolder succeed!");
		}else{
			console.log("movefolder failed!");
		}
	});
});
//gopath encrypt
router.post('/drive_temp/gopath', function(req,res){
	var path=req.body.path;
	var foldername=req.body.foldername;
	var decryptpath="";
	console.log(path);
	console.log(foldername);
	if(path!=''){
		decryptpath=path+"/"+foldername+"/";
	}else{
		decryptpath="/"+foldername+"/";
	}
	console.log('decrypt', decryptpath);
	var encryptpath=cryptoM.encrypt(decryptpath);
	console.log("e : "+encryptpath);
	var url="/dropbox/drive/"+req.session.user_id+"/"+encryptpath;
	res.redirect(url);
});

router.post('/drive_temp/group/gopath', function(req,res){
	var path=req.body.path;
	var foldername=req.body.group_name;
	var decryptpath="";
	if(path!=''){
		decryptpath=cryptoM.decrypt(path);
		decryptpath=decryptpath+"/"+foldername;
	}else{
		decryptpath="/"+foldername;
	}
	console.log('decrypt', decryptpath);
	var encryptpath=cryptoM.encrypt(decryptpath);
	console.log("e : "+encryptpath);
	//var url="/dropbox/drive/drive_temp/"+req.body.group_index+"/"+encryptpath;
	var url="/dropbox/drive/share/"+req.body.group_index+"/"+req.body.group_name;
	res.redirect(url);
});


router.post('/drive_temp/multiupload_file',function(req,res){ 
	console.log(1);
});



module.exports = router;






/*
router.get('/', function(req, res) {
	console.log("user_id: ");
	console.log(req.session.user_id);
    //=====================
    var data = [{userName:req.session.user_id, userGroup:"none"}
                ,{name:"file1", type:"folder"},{name:"file2", type:"folder"},{name:"file3", type:"folder"}
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
//});