var express = require('express');
var request = require('request');
var router = express.Router();
var async = require('async');

var S3= require('./../../public/modules/s3/s3.js');
var path = require('path');
var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-2'});
var mkdirp = require('mkdirp');

function mkdownloaddir(userid, groupname, callback){
	var dir="./views/download/"+userid+"/"+groupname;
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

var Group = {
	isgroupmember: function(user_id, group_index, callback){
		var sqlquery3 = "SELECT * FROM group_user_relation WHERE group_member_user_id = ? AND group_index= ?";
		var val=[user_id, group_index];
  			connection.query(sqlquery3,val,function(err,row){
    			if(!err){
					if(row.length!=0){
						console.log("leader : ", row[0]);
						callback(true, row[0].group_leader);
					}else{
						console.log("false");
						callback(false);
					}
				}else{
					console.log("find group index failed");
					callback(false);
				}
		});
	},	
	
	getgroupname: function(group_index, callback){
		var sqlquery3 = "SELECT * FROM groups WHERE group_index = ?";
		var val=[group_index];
  			connection.query(sqlquery3,val,function(err,row){
    			if(!err){
					if(row.length!=0){
						console.log("groupname : ", row[0].group_name);
						callback(true, row[0].group_name);
					}else{
						console.log("false");
						callback(false);
					}
				}else{
					console.log("find group index failed");
					callback(false);
				}
		});
	},	
	
 getgroupinfo: function(user_id, cb3){
		var sqlquery = "SELECT * FROM group_user_relation WHERE group_member_user_id = ?";
  			connection.query(sqlquery,user_id,function(err,rows){
    			if(!err){
					cb3(true, rows);
				}else{
					console.log("find group index failed");
					cb3(false);
				}
		});
	},
	getgroupinsidelist :function (path, leader, cb){
		S3.getFileList(S3.TEST_BUCKET_NAME, leader, path, function(result, list){
			console.log("getgroupinsidelist");
				if(result==1){
					var pyfiles=[];
					var javafiles=[];
					var cppfiles=[];
					var txtfiles=[];
					var jsfiles=[];
					var images=[];
					var others=[];
					var folderlist=[];
					console.log(list.Contents);
					console.log("Length : ", list.Contents.length);
					var num=1;
					if(list.Contents.length!=0){
					for (i=1; i<list.Contents.length; i++) {
						console.log("i ", i);
							console.log("num", num);
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
							}else if(extension[extension.length-1]=='jpg' || extension[extension.length-1]=='jpeg' || extension[extension.length-1]=='png'){
								images.push(list.Contents[i]);
							}
							else{
								others.push(list.Contents[i]);
							}							
						}
						num=num+1;
						if(num>=list.Contents.length){
								console.log(-1);
								cb(true, folderlist, pyfiles, javafiles, txtfiles, jsfiles, others, cppfiles, images);
							}
					}
						/*if(num==1){
								cb(true, folderlist, pyfiles, javafiles, txtfiles, jsfiles, others, cppfiles, images);
						}*/
						
					}else{
						cb(true, folderlist, pyfiles, javafiles, txtfiles, jsfiles, others, cppfiles, images);
					}
				}else{
					cb(false, null, null,null,null,null,null);
				}
		});
	
	},
 getgflist : function(user_id, foldername, path, cb){
	console.log("getflist!");
		Group.getgroupinfo(user_id, foldername, function(result, ginfos){
		if(result==true){
			for (var i=0 ;i<ginfos.length; i++){
				var leader=ginfos[i].group_leader;
				var group_name=ginfos[i].group_name;
			S3.getFileList(S3.TEST_BUCKET_NAME, leader, group_name, function(result, list){
				if(result==1){
					var pyfiles=[];
					var javafiles=[];
					var cppfiles=[];
					var txtfiles=[];
					var jsfiles=[];
					var images=[];
					var others=[];
					var folderlist=[];
					console.log(list.Contents);
					var num=1;
					for (i=1; i<list.Contents.length; i++) {
						if(list.Contents[i].Key.slice(-1) == '/'){ //folder
							folderlist.push(list.Contents[i]);
						}else{ //file
							var extension=list.Contents[i].Key.split('.'); //확장자 확인
							console.log(-1);
							console.log("ext" ,extension);
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
							}else if(extension[extension.length-1]=='jpg' || extension[extension.length-1]=='jpeg' || extension[extension.length-1]=='png'){
								images.push(list.Contents[i]);
							}else{
								others.push(list.Contents[i]);
							}
						}
						num=num+1;
						if(num==list.Contents.length){
							console.log("flist" ,folderlist);
							console.log("txt" ,txtfiles);
							cb(true, folderlist, pyfiles, javafiles, txtfiles, jsfiles, others, cppfiles, images);}
						}
						}else{ cb(false, null, null,null,null,null,null);}
					});
				}
		}else{
		throw err;}
	});
	},
	creategroup :function (groupname, leader, userarray, callback){ 
		console.log("create path true");
		var g_index="";
		console.log("groupname : ", groupname);
		console.log("leader : ", leader);
		console.log("userarray : ", userarray);
		var sql = 'INSERT INTO `groups` SET `group_name`=?, `group_leader_user_id`=?;';
        var values = [groupname, leader];
        connection.query(sql, values, function (err) {
            if (err) {
                console.log("inserting user failed");
                throw err;
            } else {
				console.log("insert into groups success");
				var sqlquery = "SELECT * FROM groups WHERE group_name =? AND group_leader_user_id=? "; //get group_index
				connection.query(sqlquery,[groupname, leader],function(err,row){
    				if(!err){
						var count=0;
						for (var m=0; m<userarray.length; m++){
						Group.insertrelation(userarray[m], row[0].group_index, row[0].group_name, row[0].group_leader_user_id,
							function(result){
								if(result==true){
									console.log("insert relation true");
									count+=1;
									console.log("count : " ,count);
									if(count==userarray.length){
										mkdownloaddir(row[0].group_leader_user_id, row[0].group_name, function(result){
										if(result==true){
											console.log("mkdirtrue!");
											var url='/dropbox/drive/'+row[0].group_leader_user_id;
                    						callback(true, url);
										}else{
										res.redirect('back');
										}
									});
										callback(true);
									}
								}
							});
						}
					}else{
						console.log("find group index failed");
						throw err;
					}
				});
            }
		});
	},
	insertrelation : function(userid, group_index, group_name, leader, callback) {
				var sqlquery2 = "SELECT  * FROM users WHERE user_id = ?";
  				connection.query(sqlquery2, userid , function(err,rows){
    				if(!err){ // check if user is a registered user
      				var sql = 'INSERT INTO `group_user_relation` SET `group_index`=?,`group_member_user_id`=?, `group_name`=?, 								`group_leader`=?';
						console.log("uid " ,userid);
                	 var values4 = [group_index, userid, group_name, leader];
                	connection.query(sql, values4, function (err) {
                    	if (err) {
                        	console.log("inserting user failed");
                    	} else {
							console.log("insert into groups success");
							callback(true);
                    	}
					});	
    				} else {
      					console.log("내 정보를 가져오는데 실패했습니다!");
						throw err;
    				}
  				});
			}

};

module.exports = Group;