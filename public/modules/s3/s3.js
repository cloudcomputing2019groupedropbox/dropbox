/*
AWS S3 유저 파일시스템 접근 모듈

현재 설계 상태
1. 유저 root 디렉토리는 drive/userId/
2. 삭제한 파일은 dropbox/trashcan/userId/ + (원래 파일 경로) 경로에 저장된다. 예시는 다음과 같다.
삭제 전 파일 경로: drive/userId/tetdir/test.txt
삭제 후 파일 경로: dropbox/trashcan/userId/testdir/test.txt
3. dropbox/trashcan/ 경로에 30일 이후 자동 삭제 규칙을 적용하였다.
4. 구 버전 파일은 dropbox/version/userId/ + (원래 파일 경로) + (버전) 경로에 저장되며, 네이밍 규칙 및 예시는 다음과 같다.
최신 파일: drive/userId/testdir/test.txt
버전1: dropbox/version/userId/testdir/test_1.txt
버전2: dropbox/version/userId/testdir/test_2.txt
*/

var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-2'});

// 테스트용 상수
var TEST_BUCKET_NAME = 'khu.2019.cse335.e';
var TEST_USER_NAME = 'test1';
var TEST_SOURCE_FILE = 'test_file.txt';
var DOWNLOAD_DIR = 'download';

var s3 = new AWS.S3({apiVersion:'2006-03-01'});
var fs = require('fs');
var path = require('path');
var uuid = require('uuid');

/* 
함수 사용 메뉴얼
1. 모든 함수는 버킷 이름, 유저 아이디, callback 함수를 공통 파라미터로 가진다.
2. 모든 파일 또는 디렉토리 파라미터는 문자열 양 끝 단에 '/' 기호를 제외하고 입력한다. ex1) 'temp/user.txt' (o) '/temp/user.txt' (x) ex2) 'temp/src' (o) 'temp/src/' (x)
3. 휴지통 복원, 휴지통 삭제를 제외한 모든 파일 또는 디렉토리 파라미터는 유저의 입장에서 입력한다. ('temp/user.txt' 입력 시 실제 파일 경로는 'userId/temp/user.txt')
4. 휴지통 복원, 휴지통 삭제 함수의 파일 또는 디렉토리 파라미터는 전체 경로를 입력한다. ex) 'dropbox/trashcan/userId/7110bd04-41cc-4704-8a29-505edc626fe4/test_dir/test_file.txt'
5. s3 응답 요청에 소요되는 시간이 있어 비동기적인 수행을 위해 본 js 파일의 모든 함수는 파라미터로 callback 함수를 받는다.
6. 모든 함수의 callback 함수는 첫 번째 파라미터에 성공(1) 및 실패(0) 여부 값을 전달한다.
7. 모든 GET 함수의 callback 함수는 두 번째 파라미터에 GET하고자 하는 데이터를 전달한다.
8. 실패 시 오류 내용은 서버 콘솔 로그에 기록된다.
*/

/*var crypto = require('crypto');
const key = "cloud_computing";

exports.cryptoHash = function(pw){*/

// 신규 유저를 위한 파일 시스템 생성 (폴더 drive/userId/ 생성)
//function userInit(bucketName, userId, callback) {
var S3 = {
	TEST_BUCKET_NAME: TEST_BUCKET_NAME,
	
	// 파일 영구 삭제
	deleteFileAdmin: function(bucketName, targetFile, callback) {
		var deleteParams = {
			Bucket: bucketName,
			Key: targetFile
		};
		
		s3.deleteObject(deleteParams, function(err, data) {
			if (err) {
				console.log("Delete Error", err);
				callback(0);
			} if (data) {
				console.log("Delete Success");
				callback(1);
			}
		});
	},
	
	// 복수 파일 영구 삭제
	deleteFilesAdmin: function(bucketName, targetFiles, callback) {
		var deleteParams = {
			Bucket: bucketName,
			Delete: {
				Objects: targetFiles,
				Quiet: false
			}
		};

		s3.deleteObjects(deleteParams, function(err, data) {
			if (err) {
				console.log("Delete Files or Folders Error", err);
				callback(0);
			} if (data) {
				console.log("Delete Files or Folders Success");
				callback(1);
			}
		});
	},
	
	// 파일 복사
	copyFileAdmin: function(bucketName, sourceFile, targetPath, callback) {
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/' + sourceFile,
			Key: targetPath + '/' + path.basename(sourceFile)
		};
		
		s3.copyObject(copyParams, function(err, data) {
			if (err) {
				console.log("Copy Error");
				callback(0);
			} if (data) {
				console.log("Copy Success");
				callback(1);
			}
		});
	},
	
	// 파일 이동
	moveFileAdmin: function(bucketName, sourceFile, targetPath, callback) {
		S3.copyFileAdmin(bucketName, sourceFile, targetPath, function(res) {
			if (!res) {
				console.log("Move File Error on Copying File");
				callback(0);
			} else {
				S3.deleteFileAdmin(bucketName, sourceFile, function(res) {
					if (!res) {
						console.log("Move File Error on Deleting File");
						callback(0);
					} else {
						console.log("Move File Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 파일 이름 변경
	renameFileAdmin: function(bucketName, sourceFile, newName, callback) {
		var targetPath = sourceFile.substring(0, sourceFile.length - path.basename(sourceFile).length - 1);
		
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/' + sourceFile,
			Key: targetPath + '/' + newName
		};
		
		s3.copyObject(copyParams, function(err, data) {
			if (err) {
				console.log("Rename File Error on Copying File");
				callback(0);
			} if (data) {
				S3.deleteFileAdmin(bucketName, sourceFile, function(res) {
					if (!res) {
						console.log("Rename File Error on Deleting File");
						callback(0);
					} else {
						console.log("Rename File Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 폴더 또는 파일 복사
	copyObjectAdmin: function(bucketName, sourceObject, targetPath, callback) {
		var objectName = path.basename(sourceObject);
		if (sourceObject[sourceObject.length - 1] == '/') {	// 오브젝트가 폴더인 경우 오브젝트 이름 끝에 '/' 삽입
			objectName = objectName + '/';
		}
		
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/' + sourceObject,
			Key: targetPath + '/' + objectName
		};
		
		s3.copyObject(copyParams, function(err, data) {
			if (err) {
				console.log("Copy Error");
				callback(0);
			} if (data) {
				console.log("Copy Success");
				callback(1);
			}
		});
	},
	
	// 폴더 또는 파일 삭제
	deleteObjectAdmin: function(bucketName, targetObject, callback) {
		var deleteParams = {
			Bucket: bucketName,
			Key: targetObject
		};
		
		s3.deleteObject(deleteParams, function(err, data) {
			if (err) {
				console.log("Delete Error", err);
				callback(0);
			} if (data) {
				console.log("Delete Success");
				callback(1);
			}
		});
	},
	
	// 단일 폴더 또는 파일 이동
	moveObjectAdmin: function(bucketName, sourceObject, targetPath, callback) {
		S3.copyObjectAdmin(bucketName, sourceObject, targetPath, function(res) {
			if (!res) {
				console.log("Move Error on Copying Object");
				callback(0);
			} else {
				S3.deleteObjectAdmin(bucketName, sourceObject, function(res) {
					if (!res) {
						console.log("Move Error on Deleting Object");
						callback(0);
					} else {
						console.log("Move Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 복수 폴더 또는 파일 이동
	moveObjectsAdmin: function(iter, errObjects, bucketName, sourceObjects, targetPath, callback) {
		if (iter < sourceObjects.length) {
			S3.moveObjectAdmin(bucketName, sourceObjects[iter], targetPath, function(res) {
				if (!res) {
					errObjects.push(sourceObjects[iter]);
				}
				S3.moveObjectsAdmin(iter + 1, errObjects, bucketName, sourceObjects, targetPath, callback);
			});
		} else {
			if (errObjects.length != 0) {
				console.log("Move Objects Error on Moving Some Objects");
				callback(0, errObjects);
			} else {
				console.log("Move Objects Success");
				callback(1, errObjects);
			}
		}
	},
	
	// 복수 폴더 또는 파일을 각각의 목적 경로에 이동
	moveEachObjectsAdmin: function(iter, errObjects, bucketName, sourceObjects, targetPaths, callback) {
		if (iter < sourceObjects.length) {
			S3.moveObjectAdmin(bucketName, sourceObjects[iter], targetPaths[iter], function(res) {
				if (!res) {
					errObjects.push(sourceObjects[iter]);
				}
				S3.moveEachObjectsAdmin(iter + 1, errObjects, bucketName, sourceObjects, targetPaths, callback);
			});
		} else {
			if (errObjects.length != 0) {
				console.log("Move Each Objects Error on Moving Some Objects");
				callback(0, errObjects);
			} else {
				console.log("Move Each Objects Success");
				callback(1, errObjects);
			}
		}
	},
	
	// 폴더 또는 파일 목록 접근
	getObjectListAdmin: function(bucketName, targetPath, callback) {
		var bucketParams = {
			Bucket : bucketName,
			Prefix: targetPath
		};

		s3.listObjects(bucketParams, function(err, data) {
			if (err) {
				console.log("List Error", err);
				callback(0, data);
			} if (data) {
				console.log("List Success");
				callback(1, data);
			}
		});
	},
	
	// 유저 파일 시스템 초기화
	userInit: function(bucketName,userId, callback){
		var params = {
			Bucket: bucketName,
			Key: 'drive/' + userId + '/',
		};

		s3.putObject(params, function(err, data) {
			if (err) {
				console.log("User Init Error on Making User Directory", err);
				callback(0);
			} if (data) {
				params.Key = 'dropbox/version/' + userId + '/';
				s3.putObject(params, function(err, data) {
					if (err) {
						console.log("User Init Error on Making User Version Directory");
						callback(0);
					} if (data) {
						params.Key = 'dropbox/trashcan/' + userId + '/';
						s3.putObject(params, function(err, data) {
							if (err) {
								console.log("User Init Error on Making Trashcan Directory");
								callback(0);
							} if (data) {
								console.log("User Init Success");
								callback(1);
							}
						});
					}
				});
			}
		});
	},


	// 유저의 특정 폴더 내 모든 파일 및 폴더 목록 접근
	getFileList: function (bucketName, userId, targetPath, callback) {
		var prefix;
		if(targetPath==''){
			prefix='drive/' + userId + '/';
		}
		else{
			prefix='drive/' + userId + '/' + targetPath + '/';
		}
		console.log("prefix : " , prefix);
		var bucketParams = {
			Bucket : bucketName,
			Prefix: prefix
		};

		s3.listObjects(bucketParams, function(err, data) {
			if (err) {
				console.log("List Error", err);
				callback(0, data);
			} if (data) {
				console.log("List Success");
				console.log("data : " , data);
				callback(1, data);
			}
		});
	},

	// 유저의 파일 시스템에 단일 파일 업로드 (서버로부터)
	uploadFile: function(bucketName, userId, sourceFile, targetPath, body, callback) {
		var pathbody= require('fs').createReadStream(body);
		console.log("ufile : ",targetPath);
		if (targetPath != "") {
			targetPath = targetPath  + "/"+sourceFile;
		}else{
			console.log("targetPath root : ", targetPath);
			targetPath=sourceFile;
		}
		
		console.log("body : ", body);
		var targetFile = targetPath;
		console.log("tfile ", targetFile);
		var uploadParams = {
			Bucket: bucketName,
			Key: 'drive/' + userId + '/' + targetFile,
			Body: pathbody
		};
		console.log('drive/' + userId + '/' + targetFile);
		S3.isFileOverlapped(bucketName, userId, targetFile, function(res, ans) {
			if (!res) {
				console.log('Upload Error on Checking If Overlapped');
				callback(0);
			} else {
				if (ans) {	// 파일 이름이 중복되는 경우: 새 버전을 만든 후 업로드
					S3.isVersionedFile(bucketName, userId, targetFile, function(res, ans, lvNum) {
						if (!res) {
							console.log("Upload Error on Get Last Version Number");
							callback(0);
						} else {
							S3.makeVersion(bucketName, userId, targetFile, lvNum + 1, function(res) {
								if (!res) {
									console.log("Upload Error on Making Version");
									callback(0);
								} else {
									s3.upload(uploadParams, function(err, data) {
										if (err) {
											console.log("Upload Error", err);
											callback(0);
										} if (data) {
											console.log("Upload Success");
											console.log(data);
											callback(1);
										}
									});
								}
							});
						}
					});
				} else {	// 파일 이름이 중복되지 않는 파일일 경우: 바로 업로드
					s3.upload(uploadParams, function(err, data) {
						if (err) {
							console.log("Upload Error", err);
							callback(0);
						} if (data) {
							console.log("Upload Success");
							callback(1);
						}
					});
				}
			}
		});
	},
	
	// 유저의 파일 시스템에 복수 파일 업로드
	uploadFiles: function(iter, errFiles, bucketName, userId, sourceFiles, targetPath, callback) {
		if (iter < sourceFiles.length) {
			S3.uploadFile(bucketName, userId, sourceFiles[iter], targetPath, function(res) {
				if (!res) {
					errFiles.push(sourceFiles[iter]);
				}
				S3.uploadFiles(iter + 1, errFiles, bucketName, userId, sourceFiles, targetPath, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Upload Files Error on Uploading Some Files");
				callback(0, errFiles);
			} else {
				console.log("Upload Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 유저의 파일 시스템에서 단일 파일 영구 삭제
	deleteFile: function(bucketName, userId, targetFile, callback) {
		var deleteParams = {
			Bucket: bucketName,
			Key: 'drive/' + userId + '/' + targetFile
		};
		S3.isVersionedFile(bucketName, userId, targetFile, function(res, ans, lvNum) {
			if (!res) {
				console.log("Delete Error on Checking If Versioned");
				callback(0);
			} else {
				if (ans) {	// 버전 파일이 존재하는 경우: 모든 버전 파일을 삭제한 후 해당 파일을 삭제한다.
					S3.deleteAllVersionFile(bucketName, userId, targetFile, lvNum, function(res) {
						if (!res) {
							console.log("Delete Error on Deleting All Versioned File");
							callback(0);
						} else {
							s3.deleteObject(deleteParams, function(err, data) {
								if (err) {
									console.log("Delete Error", err);
									callback(0);
								} if (data) {
									console.log("Delete Success");
									callback(1);
								}
							});
						}
					});
				} else {	// 버전 파일이 존재하지 않는 경우: 해당 파일을 바로 삭제한다.
					s3.deleteObject(deleteParams, function(err, data) {
						if (err) {
							console.log("Delete Error", err);
							callback(0);
						} if (data) {
							console.log("Delete Success");
							callback(1);
						}
					});
				}
			}
		});
	},
	
	deleteFiles: function(iter, errFiles, bucketName, userId, targetFiles, callback) {
		if (iter < targetFiles.length) {
			S3.deleteFile(bucketName, userId, targetFiles[iter], function(res) {
				if (!res) {
					errFiles.push(targetFiles[iter]);
				}
				S3.deleteFiles(iter + 1, errFiles, bucketName, userId, targetFiles, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Delete Files Error on Deleting Some Files");
				callback(0, errFiles);
			} else {
				console.log("Delete Files Success");
				callback(1, errFiles);
			}
		}
	},

	// 유저의 파일 시스템에서 폴더 생성
	createPath: function(bucketName, userId, targetPath, callback) {
		var prefix='drive/' + userId + '/' + targetPath + '/';
		var up_prefix = prefix.replace("//", "/");
		console.log(up_prefix);
		var params = {
			Bucket: bucketName,
			Key: up_prefix,
		};

		s3.putObject(params, function(err, data) {
			if (err) {
				console.log("Create Path Error", err);
				callback(0);
			} if (data) {
				console.log("Create Path Success");
				callback(1);
			}
		});
	},
	
	// 유저의 파일 시스템에서 복수 폴더 생성 (폴더 복사 시 호출)
	createPaths: function(iter, errPaths, bucketName, userId, targetPaths, callback) {
		if (iter < targetPaths.length) {
			S3.createPath(bucketName, userId, targetPaths[iter], function(res) {
				if (!res) {
					errPaths.push(targetPaths[iter]);
				}
				S3.createPaths(iter + 1, errPaths, bucketName, userId, targetPaths, callback);
			});
		} else {
			if (errPaths.length != 0) {
				console.log("Create Paths Error on Creating Some Paths");
				callback(0, errPaths);
			} else {
				console.log("Create Paths Success");
				callback(1, errPaths);
			}
		}
	},

	// 유저의 파일 시스템에서 단일 폴더 삭제 (폴더 내의 모든 파일 및 폴더들을 삭제한다.)
	deletePath: function(bucketName, userId, targetPath, callback) {
		S3.getFileList(bucketName, userId, targetPath + '/', function(res, data) {
			if (!res) {
				console.log("Delete Path Error on Fetching File List");
				callback(0);
			} else {
				var object = data.Contents;
				var fileList = [];
				var pathList = [];
				for (var idx = 0; idx < object.length; idx++) {
					var objectName = object[idx].Key;
					if (objectName.charAt(objectName.length - 1) != '/') {
						fileList.push(objectName);	// 파일 리스트에 파일 추가
					} else { 
						pathList.push({Key: objectName});	// 폴더 리스트에 폴더 추가
					}
				}
				if (fileList.length != 0) {	// 폴더 하위의 파일이 존재하는 경우: 파일 먼저 삭제 후 폴더 삭제
					var targetFiles = [];
					for (var i = 0; i < fileList.length; i++) {
						var fullPath = fileList[i];
						var p = fullPath.split('/');
						var s = p[0].length + p[1].length + 2;
						var vp = fullPath.substring(s);
						targetFiles.push(vp);
					}
					S3.deleteFiles(0, [], bucketName, userId, targetFiles, function(res) {	// 폴더 하위의 모든 파일 삭제
						if (!res) {
							console.log("Delete Path Error on Deleting Files");
							callback(0);
						} else {
							S3.deleteFilesAdmin(bucketName, pathList, function(res) {	// 폴더 하위의 모든 폴더 삭제
								if (!res) {
									console.log("Delete Path Error on Deleting Folders");
									callback(0);
								} else {
									console.log("Delete Path Success");
									callback(1);
								}
							});
						}
					});
				} else {	// 폴더 하위의 파일이 존재하지 않는 경우: 바로 폴더 삭제
					S3.deleteFilesAdmin(bucketName, pathList, function(res) {	// 폴더 하위의 모든 폴더 삭제
						if (!res) {
							console.log("Delete Path Error on Deleting Folders");
							callback(0);
						} else {
							console.log("Delete Path Success");
							callback(1);
						}
					});
				}
			}
		});
	},
	
	// 유저의 파일 시스템에서 복수 폴더 삭제
	deletePaths: function(iter, errPaths, bucketName, userId, targetPaths, callback) {
		if (iter < targetPaths.length) {
			S3.deletePath(bucketName, userId, targetPaths[iter], function(res) {
				if (!res) {
					errPaths.push(targetPaths[iter]);
				}
				S3.deletePaths(iter + 1, errPaths, bucketName, userId, targetPaths, callback);
			});
		} else {
			if (errPaths.length != 0) {
				console.log("Delete Paths Error on Deleting Some Paths");
				callback(0, errPaths);
			} else {
				console.log("Delete Paths Success");
				callback(1, errPaths);
			}
		}
	},

	// 유저의 파일 시스템에서 단일 파일 복제
	copyFile: function(bucketName, userId, sourceFile, targetPath, callback) {
		var targetPath_k;
		if (targetPath != '') {
			targetPath_k = targetPath + '/';
		}
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/drive/' + userId + '/' + sourceFile,
			Key: 'drive/' + userId + '/' + targetPath_k + path.basename(sourceFile)
		};
		S3.isVersionedFile(bucketName, userId, sourceFile, function(res, ans, lvNum) {
			if (!res) {
				console.log("Copy Error on Checking If Versioned");
				callback(0);
			} else {
				if (ans) {	// 버전 파일이 존재하는 경우: 모든 버전 파일을 삭제한 후 해당 파일을 삭제한다.
					S3.copyAllVersionFile(0, [], bucketName, userId, sourceFile, targetPath, lvNum, function(res, errFiles) {
						if (!res) {
							console.log("Copy Error on Copying All Versioned File");
							callback(0);
						} else {
							s3.copyObject(copyParams, function(err, data) {
								if (err) {
									console.log("Copy Error", err);
									callback(0);
								} if (data) {
									console.log("Copy Success");
									callback(1);
								}
							});
						}
					});
				} else {	// 버전 파일이 존재하지 않는 경우: 해당 파일을 바로 삭제한다.
					s3.copyObject(copyParams, function(err, data) {
						if (err) {
							console.log("Copy Error", err);
							callback(0);
						} if (data) {
							console.log("Copy Success");
							callback(1);
						}
					});
				}
			}
		});
	},
	
	// 유저의 파일 시스템에서 복수 파일 복제
	copyFiles: function(iter, errFiles, bucketName, userId, sourceFiles, targetPath, callback) {
		if (iter < sourceFiles.length) {
			S3.copyFile(bucketName, userId, sourceFiles[iter], targetPath, function(res) {
				if (!res) {
					errFiles.push(sourceFiles[iter]);
				}
				S3.copyFiles(iter + 1, errFiles, bucketName, userId, sourceFiles, targetPath, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Copy Files Error on Copying Some Files");
				callback(0, errFiles);
			} else {
				console.log("Copy Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 유저의 파일 시스템에서 복수 파일을 각각의 목적지로 복제 (copyPath 에서 호출)
	copyEachFiles: function(iter, errFiles, bucketName, userId, sourceFiles, targetPaths, callback) {
		if (iter < sourceFiles.length) {
			S3.copyFile(bucketName, userId, sourceFiles[iter], targetPaths[iter], function(res) {
				if (!res) {
					errFiles.push(sourceFiles[iter]);
				}
				S3.copyEachFiles(iter + 1, errFiles, bucketName, userId, sourceFiles, targetPaths, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Copy Each Files Error on Copying Some Files");
				callback(0, errFiles);
			} else {
				console.log("Copy Each Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 유저의 파일 시스템에서 단일 폴더 복사 (copyFile과는 다르게, 파라미터 targetPath를 폴더 이름을 포함하도록 파라미터로 받는다.)
	copyPath: function(bucketName, userId, sourcePath, targetPath, callback) {
		S3.getFileList(bucketName, userId, sourcePath + '/', function(res, data) {
			if (!res) {
				console.log("Copy Path Error on Fetching File List");
				callback(0);
			} else {
				var object = data.Contents;
				var fileList = [];
				var pathList = [];
				for (var idx = 0; idx < object.length; idx++) {
					var objectName = object[idx].Key;
					var p = objectName.split('/');
					var s = p[0].length + p[1].length + 2;
					var sourceObject = objectName.substring(s);
					if (sourceObject.charAt(sourceObject.length - 1) != '/') {
						fileList.push(sourceObject);	// 파일 리스트에 파일 추가
					} else { 
						sourceObject = sourceObject.substring(0, sourceObject.length - 1);
						var newPath = targetPath + sourceObject.substring(sourcePath.length);
						pathList.push(newPath);	// 폴더 리스트에 폴더 추가
					}
				}
				S3.createPaths(0, [], bucketName, userId, pathList, function(res, errPaths) {
					if (!res) {
						console.log("Copy Path Error on Creating some Paths");
						callback(0, errPaths);
					} else {
						var targetPathList = [];
						for (var i = 0; i < fileList.length; i++) {
							var rightPath = fileList[i].substring(sourcePath.length + 1, fileList[i].length - 						path.basename(fileList[i]).length - 1);
							if (rightPath != '') {
								if (rightPath == '/') {
									rightPath = '';
								} else {
									rightPath = '/' + rightPath;
								}
							}
							targetPathList.push(targetPath + rightPath);
						}
						// return;
						S3.copyEachFiles(0, [], bucketName, userId, fileList, targetPathList, function(res, errFiles) {
							if (!res) {
								console.log("Copy Path Error on Copying Each Files");
								callback(0, errFiles);
							} else {
								console.log("Copy Path Success");
								callback(1, errFiles);
							}
						});
					}
				});
			}
		});
	},
	
	// 유저의 파일 시스템에서 복수 폴더 복사
	copyPaths: function(iter, errPaths, bucketName, userId, sourcePaths, targetPath, callback) {
		var targetPath_k = '';
		if (iter < sourcePaths.length) {
			if (targetPath != '') {
				targetPath_k = targetPath + '/';
			}
			var sp = sourcePaths[iter].split('/');
			var eachTargetPath = targetPath_k + sp[sp.length - 1];
			S3.copyPath(bucketName, userId, sourcePaths[iter], eachTargetPath, function(res) {
				if (!res) {
					errPaths.push(sourcePaths[iter]);
				}
				S3.copyPaths(iter + 1, errPaths, bucketName, userId, sourcePaths, targetPath, callback);
			});
		} else {
			if (errPaths.length != 0) {
				console.log("Copy Paths Error on Copying Some Paths");
				callback(0, errPaths);
			} else {
				console.log("Copy Paths Success");
				callback(1, errPaths);
			}
		}
	},

	// 유저의 파일 시스템에서 단일 파일 이동 (복제 및 삭제)
	moveFile: function(bucketName, userId, sourceFile, targetPath, callback) {
		S3.copyFile(bucketName, userId, sourceFile, targetPath, function(res) {
			if (!res) {
				console.log("Move Error on Copying File");
				callback(0);
			} else {
				S3.deleteFile(bucketName, userId, sourceFile, function(res) {
					if (!res) {
						console.log("Move Error on Deleting File");
						callback(0);
					} else {
						console.log("Move Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 유저의 파일 시스템에서 복수 파일 이동
	moveFiles: function(iter, errFiles, bucketName, userId, sourceFiles, targetPath, callback) {
		if (iter < sourceFiles.length) {
			S3.moveFile(bucketName, userId, sourceFiles[iter], targetPath, function(res) {
				if (!res) {
					errFiles.push(sourceFiles[iter]);
				}
				S3.moveFiles(iter + 1, errFiles, bucketName, userId, sourceFiles, targetPath, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Move Files Error on Moving Some Files");
				callback(0, errFiles);
			} else {
				console.log("Move Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 유저의 파일 시스템에서 단일 폴더 이동 (moveFile과는 다르게, 파라미터 targetPath를 폴더 이름을 포함하도록 파라미터로 받는다.)
	movePath: function(bucketName, userId, sourcePath, targetPath, callback) {
		S3.copyPath(bucketName, userId, sourcePath, targetPath, function(res, errObjects) {
			if (!res) {
				console.log("Move Path Error on Copying Path");
				callback(0, errObjects);
			} else {
				S3.deletePath(bucketName, userId, sourcePath, function(res) {
					if (!res) {
						console.log("Move Path Error on Deleting Path");
						callback(0);
					} else {
						console.log("Move Path Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 유저의 파일 시스템에서 복수 폴더 이동
	movePaths(iter, errPaths, bucketName, userId, sourcePaths, targetPath, callback) {
		var targetPath_k = '';
		if (iter < sourcePaths.length) {
			if (targetPath != '') {
				targetPath_k = targetPath + '/';
			}
			var sp = sourcePaths[iter].split('/');
			var eachTargetPath = targetPath_k + sp[sp.length - 1];
			S3.movePath(bucketName, userId, sourcePaths[iter], eachTargetPath, function(res) {
				if (!res) {
					errPaths.push(sourcePaths[iter]);
				}
				S3.movePaths(iter + 1, errPaths, bucketName, userId, sourcePaths, targetPath, callback);
			});
		} else {
			if (errPaths.length != 0) {
				console.log("Move Paths Error on Moving Some Paths");
				callback(0, errPaths);
			} else {
				console.log("Move Paths Success");
				callback(1, errPaths);
			}
		}
	},
	
	// 유저의 파일 시스템에서 파일 이름 변경
	renameFile: function(bucketName, userId, sourceFile, newName, callback) {
		var targetPath = sourceFile.substring(0, sourceFile.length - path.basename(sourceFile).length - 1);
		
		if (targetPath != '') {
			targetPath = targetPath + '/';
		}
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/drive/' + userId + '/' + sourceFile,
			Key: 'drive/' + userId + '/' + targetPath + newName
		};
		S3.isVersionedFile(bucketName, userId, sourceFile, function(res, ans, lvNum) {
			if (!res) {
				console.log("Rename File Error on Checking If Versioned");
				callback(0);
			} else {
				if (ans) {	// 버전 파일이 존재하는 경우: 모든 버전 파일 이름을 변경한 후 해당 파일 이름을 변경한다.
					S3.renameAllVersionFile(0, [], bucketName, userId, sourceFile, newName, lvNum, function(res, errFiles) {
						if (!res) {
							console.log("Rename File Error on Renaming All Versioned File");
							callback(0);
						} else {
							s3.copyObject(copyParams, function(err, data) {
								if (err) {
									console.log("Rename File Error on Copying File", err);
									callback(0);
								} if (data) {
									S3.deleteFileAdmin(bucketName, 'drive/' + userId + '/' + sourceFile, function(res) {
										if (!res) {
											console.log("Rename File Error on Deleting File");
											callback(0);
										} else {
											console.log("Rename File Success");
											callback(1);
										}
									});
								}
							});
						}
					});
				} else {	// 버전 파일이 존재하지 않는 경우: 해당 파일 이름을 바로 변경한다.
					s3.copyObject(copyParams, function(err, data) {
						if (err) {
							console.log("Rename File Error on Copying File", err);
							callback(0);
						} if (data) {
							S3.deleteFileAdmin(bucketName, 'drive/' + userId + '/' + sourceFile, function(res) {
								if (!res) {
									console.log("Rename File Error on Deleting File");
									callback(0);
								} else {
									console.log("Rename File Success");
									callback(1);
								}
							});
						}
					});
				}
			}
		});
	},
	
	// 유저의 파일 시스템에서 폴더 이름 변경
	renamePath: function(bucketName, userId, sourcePath, newName, callback) {
		var sp = sourcePath.split('/');
		var targetPath = sourcePath.substring(0, sourcePath.length - sp[sp.length - 1].length) + newName;
		S3.movePath(bucketName, userId, sourcePath, targetPath, function(res, errObjects) {
			if(!res) {
				console.log('Rename Path Error on Renaming Path');
				callback(0, errObjects);
			} else {
				console.log('Rename Path Success');
				callback(1, errObjects);
			}
		});
	},

	// 유저의 파일 시스템에서 단일 파일 다운로드 (서버로)
	downloadFile: function(bucketName, userId, sourceFile, callback) {
		var downParams = {
			Bucket: bucketName,
			Key: 'drive/' + userId + '/' + sourceFile
		};
		// var file = fs.createWriteStream(DOWNLOAD_DIR + '/' + path.basename(sourceFile));
		// s3.getObject(downParams).createReadStream().pipe(file);
		s3.getObject(downParams, function(err, data) {
			if (err) {
				console.log("Download File Error", err);
				callback(0);
			} if (data) {
				console.log("Download File Success");
				//fs.writeFileSync(DOWNLOAD_DIR + '/' + path.basename(sourceFile), data.Body);
				callback(1, data.Body);
			}
		});
	},
	
	// 유저의 파일 시스템에서 복수 파일 다운로드 (서버로)
	downloadFiles: function(iter, errFiles, bucketName, userId, sourceFiles, callback) {
		if (iter < sourceFiles.length) {
			S3.downloadFile(bucketName, userId, sourceFiles[iter], function(res) {
				if (!res) {
					errFiles.push(sourceFiles[iter]);
				}
				S3.downloadFiles(iter + 1, errFiles, bucketName, userId, sourceFiles, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Download Files Error on Downloading Some Files");
				callback(0, errFiles);
			} else {
				console.log("Download Files Success");
				callback(1, errFiles);
			}
		}
	},

	// 유저의 파일 시스템에서 휴지통으로 단일 파일 이동 (dropbox/trashcan/userId/ + (원본 파일 경로) 로 이동)
	disposeFile: function(bucketName, userId, sourceFile, callback) {
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/drive/' + userId + '/' + sourceFile,
			Key: 'dropbox/trashcan/' + userId + '/' + uuid.v4() + '/' + sourceFile
		};
		s3.copyObject(copyParams, function(err, data) {
			if (err) {
				console.log("Dispose File Error on Copying File", err);
				callback(0);
			} if (data) {
				S3.deleteFileAdmin(bucketName, 'drive/' + userId + '/' + sourceFile, function(result) {
					if (!result) {
						console.log("Dispose File Error on Deleting File");
						callback(0);
					} else {
						console.log("Dispose File Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 유저의 파일 시스템에서 휴지통으로 복수 파일 이동
	disposeFiles: function(iter, errFiles, bucketName, userId, sourceFiles, callback) {
		if (iter < sourceFiles.length) {
			S3.disposeFile(bucketName, userId, sourceFiles[iter], function(res) {
				if (!res) {
					errFiles.push(sourceFiles[iter]);
				}
				S3.disposeFiles(iter + 1, errFiles, bucketName, userId, sourceFiles, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Dispose Files Error on Disposing Some Files");
				callback(0, errFiles);
			} else {
				console.log("Dispose Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 유저의 파일 시스템에서 휴지통으로 단일 폴더 이동
	disposePath: function(bucketName, userId, sourcePath, callback) {
		var spHead = 'drive/' + userId + '/';
		var tpHead = 'dropbox/trashcan/' + userId + '/' + uuid.v4() + '/';
		S3.getFileList(bucketName, userId, sourcePath + '/', function(res, data) {
			if (!res) {
				console.log("Dispose Path Error on Listing Objects");
				callback(0);
			} if (data) {
				var spHead = 'drive/' + userId + '/';
				var tpHead = 'dropbox/trashcan/' + userId + '/' + uuid.v4();

				var sourceObjects = [];
				var targetPaths = [];
				for (var i = 0; i < data.Contents.length; i++) {
					var sourceObject = data.Contents[i].Key;
					sourceObjects.push(sourceObject);
					var baseName = path.basename(sourceObject);
					var tpTail;
					if (sourceObject[sourceObject.length - 1] == '/') {
						tpTail = sourceObject.substring(spHead.length, sourceObject.length - baseName.length - 1);
					} else {
						tpTail = sourceObject.substring(spHead.length, sourceObject.length - baseName.length);
					}
					if (tpTail != '') {
						tpTail = '/' + tpTail;
					}
					tpTail = tpTail.substring(0, tpTail.length - 1);
					targetPaths.push(tpHead + tpTail);
				}
				S3.moveEachObjectsAdmin(0, [], bucketName, sourceObjects, targetPaths, function(res, errObjects) {
					if (!res) {
						console.log("Dispose Path Error on Moving Some Objects");
						callback(0, errObjects);
					} else {
						console.log("Dispose Path Success");
						callback(1, errObjects);
					}
				});
			}
		});
	},
	
	// 유저의 파일 시스템에서 휴지통으로 복수 폴더 이동
	disposePaths: function(iter, errObjects, bucketName, userId, sourcePaths, callback) {
		if (iter < sourcePaths.length) {
			S3.disposePath(bucketName, userId, sourcePaths[iter], function(res) {
				if (!res) {
					errObjects.push(sourcePaths[iter]);
				}
				S3.disposePaths(iter + 1, errObjects, bucketName, userId, sourcePaths, callback);
			});
		} else {
			if (errObjects.length != 0) {
				console.log("Dispose Paths Error on Disposing Some Paths");
				callback(0, errObjects);
			} else {
				console.log("Dispose Paths Success");
				callback(1, errObjects);
			}
		}
	},
	
	// 유저의 휴지통 폴더 및 파일 정보 불러오기 (키 값이 나타내는 경로는 파일 복원 시 돌아갈 경로만을 표시하며, 유저에게 휴지통 내의 파일들은 모두 휴지통 내에서 한 번에 보여야 한다. 파일 이름이 중복되어도 키 값이 다르므로 분류가 가능하고, 유저에게 표시 시에는 같은 이름으로 두 파일 모두 표시한다.(윈도우 휴지통과 같다))
	getDisposedObjectList: function (bucketName, userId, callback) {
		var bucketParams = {
			Bucket : bucketName,
			Prefix: 'dropbox/trashcan/' + userId + '/'
		};

		s3.listObjects(bucketParams, function(err, data) {
			if (err) {
				console.log("List Error", err);
				callback(0, data);
			} if (data) {
				console.log("List Success");
				callback(1, data);
			}
		});
	},
	
	// 유저의 휴지통에서 파일 복원 (targetFile은 전체 경로이다.)
	returnDisposedFile: function(bucketName, userId, targetFile, callback) {
		var p = targetFile.split('/');
		var s = p[0].length + p[1].length + p[2].length + p[3].length + 4;
		var returnFilePath = targetFile.substring(s);
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/' + targetFile,
			Key: 'drive/' + userId + '/' + returnFilePath
		};
		s3.copyObject(copyParams, function(err, data) {
			var result;
			if (err) {
				console.log("Return Disposed File Error on Copying File", err);
				callback(0);
			} if (data) {
				S3.deleteFileAdmin(bucketName, targetFile, function(result) {
					if (!result) {
						console.log("Return Disposed File Error on Deleting File");
						callback(0);
					} else {
						console.log("Return Disposed File Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 유저의 휴지통에서 복수 파일 복원 (targetFiles는 전체 경로이다.)
	returnDisposedFiles: function(iter, errFiles, bucketName, userId, targetFiles, callback) {
		if (iter < targetFiles.length) {
			S3.returnDisposedFile(bucketName, userId, targetFiles[iter], function(res) {
				if (!res) {
					errFiles.push(targetFiles[iter]);
				}
				S3.returnDisposedFiles(iter + 1, errFiles, bucketName, userId, targetFiles, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Return Disposed Files Error on Returning Some Disposed Files");
				callback(0, errFiles);
			} else {
				console.log("Return Disposed Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 유저의 휴지통에서 단일 폴더 복원 (targetPath는 전체 경로이다.)
	// targetPath: dropbox/trashcan/userId/UUID/~
	returnDisposedPath: function(bucketName, userId, targetPath, callback) {
		S3.getObjectListAdmin(bucketName, targetPath, function(res, data) {
			if (!res) {
				console.log("Return Disposed Path Error on Listing Objects");
				callback(0);
			} if (data) {
				var _uuid = targetPath.split('/')[3];
				var spHead = 'dropbox/trashcan/' + userId + '/' + _uuid + '/';
				var tpHead = 'drive/' + userId;
				
				var sourceObjects = [];
				var targetPaths = [];
				for (var i = 0; i < data.Contents.length; i++) {
					var sourceObject = data.Contents[i].Key;
					sourceObjects.push(sourceObject);
					var baseName = path.basename(sourceObject);
					var tpTail;
					if (sourceObject[sourceObject.length - 1] == '/') {
						tpTail = sourceObject.substring(spHead.length, sourceObject.length - baseName.length - 1);
					} else {
						tpTail = sourceObject.substring(spHead.length, sourceObject.length - baseName.length);
					}
					if (tpTail != '') {
						tpTail = '/' + tpTail;
					}
					tpTail = tpTail.substring(0, tpTail.length - 1);
					targetPaths.push(tpHead + tpTail);
				}
				S3.moveEachObjectsAdmin(0, [], bucketName, sourceObjects, targetPaths, function(res, errObjects) {
					if (!res) {
						console.log("Return Path Error on Moving Some Objects");
						callback(0, errObjects);
					} else {
						console.log("Return Path Success");
						callback(1, errObjects);
					}
				});
			}
		});
	},
	
	// 유저의 휴지통에서 복수 폴더 복원 (targetPaths는 전채 경로이다.)
	returnDisposedPaths: function(iter, errObjects, bucketName, userId, targetPaths, callback) {
		if (iter < targetPaths.length) {
			S3.returnDisposedPath(bucketName, userId, targetPaths[iter], function(res) {
				if (!res) {
					errObjects.push(targetPaths[iter]);
				}
				S3.returnDisposedPaths(iter + 1, errObjects, bucketName, userId, targetPaths, callback);
			});
		} else {
			if (errObjects.length != 0) {
				console.log("Return Disposed Paths Error on Returning Some Disposed Paths");
				callback(0, errObjects);
			} else {
				console.log("Return Disposed Paths Success");
				callback(1, errObjects);
			}
		}
	},
	
	// 유저의 휴지통에서 파일 삭제 (targetFile은 전체 경로이다.)
	deleteDisposedFile(bucketName, userId, targetFile, callback) {
		var deleteParams = {
			Bucket: bucketName,
			Key: targetFile
		};
		
		var p = targetFile.split('/');
		var s = p[0].length + p[1].length + p[2].length + p[3].length + 4;
		targetFile = targetFile.substring(s);
		
		S3.isVersionedFile(bucketName, userId, targetFile, function(res, ans, lvNum) {
			if (!res) {
				console.log("Delete Disposed File Error on Checking If Versioned");
				callback(0);
			} else {
				if (ans) {	// 버전 파일이 존재하는 경우: 모든 버전 파일을 삭제한 후 해당 파일을 삭제한다.
					S3.deleteAllVersionFile(bucketName, userId, targetFile, lvNum, function(res) {
						if (!res) {
							console.log("Delete Disposed File Error on Deleting All Versioned File");
							callback(0);
						} else {
							s3.deleteObject(deleteParams, function(err, data) {
								if (err) {
									console.log("Delete Error", err);
									callback(0);
								} if (data) {
									console.log("Delete Success");
									callback(1);
								}
							});
						}
					});
				} else {	// 버전 파일이 존재하지 않는 경우: 해당 파일을 바로 삭제한다.
					s3.deleteObject(deleteParams, function(err, data) {
						if (err) {
							console.log("Delete Error", err);
							callback(0);
						} if (data) {
							console.log("Delete Disposed File Success");
							callback(1);
						}
					});
				}
			}
		});
	},
	
	// 유저의 휴지통에서 복수 파일 삭제 (targetFiles는 전체 경로이다.)
	deleteDisposedFiles(iter, errFiles, bucketName, userId, targetFiles, callback) {
		if (iter < targetFiles.length) {
			S3.deleteDisposedFile(bucketName, userId, targetFiles[iter], function(res) {
				if (!res) {
					errFiles.push(targetFiles[iter]);
				}
				S3.deleteDisposedFiles(iter + 1, errFiles, bucketName, userId, targetFiles, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Delete Disposed Files Error on Deleting Some Disposed Files");
				callback(0, errFiles);
			} else {
				console.log("Delete Disposed Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 유저의 휴지통에서 단일 폴더 삭제 (targetPath는 전체 경로이다.)
	deleteDisposedPath: function(bucketName, userId, targetPath, callback) {
		S3.getObjectListAdmin(bucketName, targetPath, function(res, data) {
			if (!res) {
				console.log("Delete Disposed Path Error on Listing Objects");
				callback(0);
			} if (data) {
				var fileList = [];
				var pathList = [];
				for (var i = 0; i < data.Contents.length; i++) {
					var targetObject = data.Contents[i].Key;
					if (targetObject[targetObject.length - 1] == '/') {
						pathList.push({Key: targetObject});
					} else {
						fileList.push(targetObject);
					}
				}
				S3.deleteDisposedFiles(0, [], bucketName, userId, fileList, function(res, errFiles) {
					if (!res) {
						console.log("Delete Disposed Path Error on Deleting Some Files");
						callback(0, errFiles);
					} else {
						S3.deleteFilesAdmin(bucketName, pathList, function(res) {
							if (!res) {
								console.log("Delete Disposed Path Error on Deleting Some Paths");
								callback(0);
							} else {
								console.log("Delete Disposed Path Success");
								callback(1);
							}
						});
					}
				});
			}
		});
	},
	
	// 유저의 휴지통에서 복수 폴더 삭제 (targetPaths는 전체 경로이다.)
	deleteDisposedPaths: function(iter, errObjects, bucketName, userId, targetPaths, callback) {
		if (iter < targetPaths.length) {
			S3.deleteDisposedPath(bucketName, userId, targetPaths[iter], function(res) {
				if (!res) {
					errObjects.push(targetPaths[iter]);
				}
				S3.deleteDisposedPaths(iter + 1, errObjects, bucketName, userId, targetPaths, callback);
			});
		} else {
			if (errObjects.length != 0) {
				console.log("Delete Disposed Paths Error on Deleting Some Disposed Paths");
				callback(0, errObjects);
			} else {
				console.log("Delete Disposed Paths Success");
				callback(1, errObjects);
			}
		}
	},
	
	// 새 버전 만들기
	makeVersion: function(bucketName, userId, targetFile, versionNum, callback) {
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/drive/' + userId + '/' + targetFile,
			Key: 'dropbox/version/' + userId + '/' + targetFile + '_' + String(versionNum)
		};
		s3.copyObject(copyParams, function(err, data) {
			if (err) {
				console.log("Make Version Error on Copying File", err);
				callback(0);
			} if (data) {
				S3.deleteFileAdmin(bucketName, 'drive/' + userId + '/' + targetFile, function(result) {
					if (!result) {
						console.log("Make Version Error on Deleting File");
						callback(0);
					} else {
						console.log("Make Version Success");
						callback(1);
					}
				});
			}
		});
	},
	
	// 버전 파일 목록 가져오기
	getVersionedFileList: function(bucketName, userId, targetPath, callback) {
		if (targetPath != '') {
			targetPath = targetPath + '/';
		}
		
		var bucketParams = {
			Bucket : bucketName,
			Prefix: 'dropbox/version/' + userId + '/' + targetPath
		};

		s3.listObjects(bucketParams, function(err, data) {
			if (err) {
				console.log("List Error", err);
				callback(0, data);
			} if (data) {
				console.log("List Success");
				callback(1, data);
			}
		});
	},
	
	// 버전 파일이 있는가 유무
	isVersionedFile: function(bucketName, userId, targetFile, callback) {
		var t = targetFile.split('/');
		var last = targetFile.length - (t[t.length - 1].length + 1);
		var targetPath = targetFile.substring(0, last);
		S3.getVersionedFileList(bucketName, userId, targetPath, function(res, data) {
			var answer = false;
			var lvNum = 0;	// 마지막 버전 수
			if (!res) {
				console.log("Version Check Error on Get List");
				callback(0, answer, lvNum);
			} if (data) {
				for (var i = data.Contents.length - 1; i >= 0; i--) {
					var fullPath = data.Contents[i].Key;
					var p = fullPath.split('/');
					var s = p[0].length + p[1].length + p[2].length + 3;
					var n = fullPath.split('_');
					var l = fullPath.length - (n[n.length - 1].length + 1);
					var vp = fullPath.substring(s, l);
					if (vp == targetFile) {
						answer = true;
						lvNum = parseInt(n[n.length - 1]);
						break;
					}
				}
				console.log("Version Check Success");
				callback(1, answer, lvNum);
			}
		});
	},
	
	// 동일 이름의 파일이 동일 경로에 있는가 유무
	isFileOverlapped: function(bucketName, userId, targetFile, callback) {
		var t = targetFile.split('/');
		var last = targetFile.length - (t[t.length - 1].length + 1);
		var targetPath = targetFile.substring(0, last);
		S3.getFileList(bucketName, userId, targetPath, function(res, data) {
			var answer = false;
			if (!res) {
				console.log("Overlap Check Error on Get List");
				callback(0, answer);
			} if (data) {
				for (var i = 0; i < data.Contents.length; i++) {
					var fullPath = data.Contents[i].Key;
					var p = fullPath.split('/');
					var s = p[0].length + p[1].length + 2;
					var vp = fullPath.substring(s);
					if (vp == targetFile) {
						answer = true;
						break;
					}
				}
				console.log("Overlap Check Success");
				callback(1, answer);
			}
		});
	},
	
	// 버전 파일 영구 삭제 및 버전 수 재정렬
	deleteVersionFile: function(bucketName, userId, targetFile, versionNum, callback) {
		S3.isVersionedFile(bucketName, userId, targetFile, function(res, ans, lvm) {
			if (!ans) {
				console.log("Delete Version File Error: Not Versioned File");
				callback(0);
			} else {
				S3.deleteFileAdmin(bucketName, 'dropbox/version/' + userId + '/' + targetFile + '_' + versionNum, function(res) {
					if (!res) {
						console.log("Delete Version File Error on Deleting Version File");
						callback(0);
					} else {
						S3.sortFileVersion([], bucketName, userId, targetFile, versionNum + 1, lvm, function(res, errFiles){
							if (!res) {
								console.log("Delete Version File Error on Sorting Version");
								callback(0);
							} else {
								console.log("Delete Version File Success");
								callback(1);
							}
						});
					}
				});
			}
		});
	},
	
	// 버전 수 재정렬
	sortFileVersion: function(errFiles, bucketName, userId, targetFile, svm, lvm, callback) {
		if (svm <= lvm) {
			S3.changeFileVersion(bucketName, userId, targetFile, svm, svm - 1, function(res) {
				if (!res) {
					errFiles.push(targetFile + '_' + (svm));
				}
				S3.sortFileVersion(errFiles, bucketName, userId, targetFile, svm + 1, lvm, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Sort File Version Error on Sorting Some File Versions");
				callback(0, errFiles);
			} else {
				console.log("Sort File Version Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 버전 수 변경
	changeFileVersion: function(bucketName, userId, sourceFile, versionNum, newVersionNum, callback) {
		var fullSourcePath = 'dropbox/version/' + userId + '/' + sourceFile + '_' + versionNum;
		var newName = path.basename(sourceFile) + '_' + newVersionNum;
		S3.renameFileAdmin(bucketName, fullSourcePath, newName,  function(res) {
			if (!res) {
				console.log("Change File Version Error on Renameing File");
				callback(0);
			} else {
				console.log("Change File Version Success");
				callback(1);
			}
		});
	},
	
	// 모든 버전 파일 삭제
	deleteAllVersionFile: function(bucketName, userId, targetFile, lastVersionNum, callback) {
		var targetFiles = [];
		for (var i = 0; i <= lastVersionNum; i++) {
			targetFiles.push({Key: 'dropbox/version/' + userId + '/' + targetFile + '_' + i});
		}
		S3.deleteFilesAdmin(bucketName, targetFiles, function(res) {
			if (!res) {
				console.log("Delete All Version File Error on Deleting Files");
				callback(0);
			} else {
				console.log("Delete All Version File Success");
				callback(1);
			}
		});
	},
	
	// 버전 파일 복사
	copyVersionFile: function(bucketName, userId, sourceFile, targetPath, versionNum, callback) {
		if (targetPath != '') {
			targetPath = '/' + targetPath;
		}
		var fullSourcePath = 'dropbox/version/' + userId + '/' + sourceFile + '_' + versionNum;
		var fullTargetPath = 'dropbox/version/' + userId + targetPath;
		S3.copyFileAdmin(bucketName, fullSourcePath, fullTargetPath,  function(res) {
			if (!res) {
				console.log("Copy Version File Error on Copying File");
				callback(0);
			} else {
				console.log("Copy Version File Success");
				callback(1);
			}
		});
	},
	
	// 모든 버전 파일 복사
	copyAllVersionFile: function(iter, errFiles, bucketName, userId, sourceFile, targetPath, lastVersionNum, callback) {
		if (iter < lastVersionNum) {
			S3.copyVersionFile(bucketName, userId, sourceFile, targetPath, iter + 1, function(res) {
				if (!res) {
					errFiles.push(sourceFile + '_' + (iter + 1));
				}
				S3.copyAllVersionFile(iter + 1, errFiles, bucketName, userId, sourceFile, targetPath, lastVersionNum, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Copy Version Files Error on Copying Some Version Files");
				callback(0, errFiles);
			} else {
				console.log("Copy Version Files Success");
				callback(1, errFiles);
			}
		}
	},
	
	// 버전 파일 이름 변경
	renameVersionFile: function(bucketName, userId, sourceFile, newName, versionNum, callback) {
		var fullSourcePath = 'dropbox/version/' + userId + '/' + sourceFile + '_' + versionNum;
		S3.renameFileAdmin(bucketName, fullSourcePath, newName + '_' + versionNum,  function(res) {
			if (!res) {
				console.log("Rename Version File Error on Renameing File");
				callback(0);
			} else {
				console.log("Rename Version File Success");
				callback(1);
			}
		});
	},
	
	// 모든 버전 파일 이름 변경
	renameAllVersionFile: function(iter, errFiles, bucketName, userId, sourceFile, newName, lastVersionNum, callback) {
		if (iter < lastVersionNum) {
			S3.renameVersionFile(bucketName, userId, sourceFile, newName, iter + 1, function(res) {
				if (!res) {
					errFiles.push(sourceFile + '_' + (iter + 1));
				}
				S3.renameAllVersionFile(iter + 1, errFiles, bucketName, userId, sourceFile, newName, lastVersionNum, callback);
			});
		} else {
			if (errFiles.length != 0) {
				console.log("Rename Version Files Error on Renaming Some Version Files");
				callback(0, errFiles);
			} else {
				console.log("Rename Version Files Success");
				callback(1, errFiles);
			}
		}
	},
	//showfile 용 dowload
	downloadFile2: function(bucketName, userId, sourceFile, callback) {
		var downParams = {
			Bucket: bucketName,
			Key: 'drive/' + userId + '/' + sourceFile
		};
		// var file = fs.createWriteStream(DOWNLOAD_DIR + '/' + path.basename(sourceFile));
		// s3.getObject(downParams).createReadStream().pipe(file);
		s3.getObject(downParams, function(err, data) {
			if (err) {
				console.log("Download File Error", err);
				callback(0);
			} if (data) {
				console.log("Download File Success");
			//	fs.writeFileSync(DOWNLOAD_DIR + '/' + path.basename(sourceFile), data.Body.toString());
				callback(1, data.Body);
			}
		});
	},
	
	downloadFile3: function(bucketName, sourceFile, callback) {
		var downParams = {
			Bucket: bucketName,
			Key: 'drive/'+sourceFile
		};
		// var file = fs.createWriteStream(DOWNLOAD_DIR + '/' + path.basename(sourceFile));
		// s3.getObject(downParams).createReadStream().pipe(file);
		s3.getObject(downParams, function(err, data) {
			if (err) {
				console.log("Download File Error", err);
				callback(0);
			} if (data) {
				console.log("Download File Success");
			//	fs.writeFileSync(DOWNLOAD_DIR + '/' + path.basename(sourceFile), data.Body.toString());
				callback(1, data.Body);
			}
		});
	},
	
	
	downloadVersionedFile: function(bucketName, userId, key, callback) {
		var downParams = {
			Bucket: bucketName,
			Key: key
		};
		// var file = fs.createWriteStream(DOWNLOAD_DIR + '/' + path.basename(sourceFile));
		// s3.getObject(downParams).createReadStream().pipe(file);
		s3.getObject(downParams, function(err, data) {
			if (err) {
				console.log("Download Versioned File Error", err);
				callback(0);
			} if (data) {
				console.log("Download Versioned File Success");
				//fs.writeFileSync(DOWNLOAD_DIR + '/' + path.basename(sourceFile), data.Body.toString());
				callback(1, data.Body);
			}
		});
	}
	
};

module.exports = S3;

// 사용예
// S3.userInit(TEST_BUCKET_NAME, TEST_USER_NAME, function(result){console.log(result);});
// S3.getFileList(TEST_BUCKET_NAME, TEST_USER_NAME, '', function(result, data){console.log(result, data);});
// S3.createPath(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir', function(result){console.log(result);});
// S3.uploadFile(TEST_BUCKET_NAME, TEST_USER_NAME, TEST_SOURCE_FILE, 'test_dir', function(result){console.log(result);});
// S3.deleteFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', function(result){console.log(result);});
// S3.deleteFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['test_dir/test1.txt', 'test_dir/test2.txt'], function(result, errFiles){console.log(result, errFiles);});
// S3.copyFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', 'new_folder', function(result){console.log(result);});
// S3.moveFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_file.txt', 'new_folder', function(result){console.log(result);});
// S3.disposeFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', function(result){console.log(result);});
// S3.deletePath(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir', function(result){console.log(result);});
// S3.downloadFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'trashcan/test_file.txt', function(result, data){console.log(result);});
// S3.getDisposedObjectList(TEST_BUCKET_NAME, TEST_USER_NAME, function(result, data){console.log(result, data);});
// S3.getDisposedObjectList(TEST_BUCKET_NAME, TEST_USER_NAME, function(result, data) {
// 	if(data) {
// 		var targetDisposedFile = data.Contents[0].Key;
// 		S3.returnDisposedFile(TEST_BUCKET_NAME, TEST_USER_NAME, targetDisposedFile, function(result){console.log(result);});
// 	}
// });
// S3.makeVersion(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', 1, function(result){console.log(result);});
// S3.getVersionedFileList(TEST_BUCKET_NAME, TEST_USER_NAME, function(result, data){console.log(data);});
// S3.isVersionedFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', function(result, answer, lastVersionNum){console.log(result, answer, lstVersionNum);});
// S3.isFileOverlapped(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', function(result, answer){console.log(result, answer);});
// S3.deleteAllVersionFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', 3, function(res){console.log(res);});
// S3.uploadFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['m_test_f1.txt', 'm_test_f2.txt'], 'test_dir', function(result, errFiles){console.log(result, errFiles);});
// S3.copyFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['test_dir/m_test_f1.txt', 'test_dir/m_test_f2.txt'], 'new_dir', function(res, errFiles){console.log(res, errFiles);});
// S3.moveFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['test_dir/m_test_f1.txt', 'test_dir/m_test_f2.txt'], 'glorious_dir', function(res, errFiles){console.log(res, errFiles);});
// S3.downloadFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['glorious_dir/m_test_f1.txt', 'glorious_dir/m_test_f2.txt'], function(res, errFiles){console.log(res, errFiles);});
// S3.disposeFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['glorious_dir/m_test_f1.txt', 'glorious_dir/m_test_f2.txt'], function(res, errFiles){console.log(res, errFiles);});
// S3.getDisposedObjectList(TEST_BUCKET_NAME, TEST_USER_NAME, function(result, data) {
// 	if(data) {
// 		var targetDisposedFiles = [];
		// for(var i = 0; i < data.Contents.length; i++) {
		// 	targetDisposedFiles.push(data.Contents[i].Key);
		// }
// 		S3.returnDisposedFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, targetDisposedFiles, function(result, errFiles){console.log(result, errFiles);});
// 	}
// });
// S3.getDisposedObjectList(TEST_BUCKET_NAME, TEST_USER_NAME, function(result, data) {
// 	if(data) {
// 		var targetDisposedFiles = [];
// 		for(var i = 0; i < data.Contents.length; i++) {
// 			targetDisposedFiles.push(data.Contents[i].Key);
// 		}
// 		S3.deleteDisposedFiles(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, targetDisposedFiles, function(result){console.log(result);});
// 	}
// });
// S3.deletePaths(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['dir_1', 'dir_2', 'dir_3'], function(res, errPaths){console.log(res, errPaths);});
// S3.renameFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/test_file.txt', 'toast_file.txt', function(res){console.log(res);});
// S3.deleteVersionFile(TEST_BUCKET_NAME, TEST_USER_NAME, TEST_SOURCE_FILE, 2, function(result){console.log(result);});
// S3.copyPath(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir', 'pop_dir/test_dir', function(result, errObjects){console.log(result, errObjects);});
// S3.copyPaths(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['new_dir', 'pop_dir', 'test_dir'], 'brand_new_dir', function(result, errObjects){console.log(result, errObjects);});
// S3.movePath(TEST_BUCKET_NAME, TEST_USER_NAME, 'new_dir', 'glorious_dir/new_dir', function(res, errObjects){console.log(res, errObjects);});
// S3.movePaths(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['glorious_dir/new_dir', 'test_dir/empty_dir'], '', function(res, errObjects){console.log(res, errObjects);});
// S3.renamePath(TEST_BUCKET_NAME, TEST_USER_NAME, 'john_dir', 'steve_dir', function(res, errObjects){console.log(res, errObjects);});
// S3.disposePath(TEST_BUCKET_NAME, TEST_USER_NAME, 'must_disposed_dir', function(res, errObjects) {console.log(res, errObjects);});
// S3.disposePaths(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['twin_dir_1', 'twin_dir_2'], function(res, errObjects) {console.log(res, errObjects);});
// S3.returnDisposedPath(TEST_BUCKET_NAME, TEST_USER_NAME, 'dropbox/trashcan/test1/b163e360-3008-4d2d-ba16-7e5fc7f2e82b/must_disposed_dir/', function(res, errObjects){console.log(res, errObjects);});
// S3.returnDisposedPaths(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['dropbox/trashcan/test1/cde298de-6645-4159-813f-979ffbf20162/twin_dir_1/', 'dropbox/trashcan/test1/17b17b9d-2353-45c8-9abf-4b10f6309354/twin_dir_2/'], function(res, errObjects){console.log(res, errObjects);});
//S3.deleteDisposedPath(TEST_BUCKET_NAME, TEST_USER_NAME, 'dropbox/trashcan/test1/84a2b2f7-7141-4acc-ab7c-ea28cad63494/john', function(res, errObjects){console.log(res, errObjects);});
//S3.deleteDisposedPaths(0, [], TEST_BUCKET_NAME, TEST_USER_NAME, ['dropbox/trashcan/test1/d71d243d-c000-4cb8-ab5e-2925a3861842/joyland/david', 'dropbox/trashcan/test1/51e59c97-de33-4bde-b09a-de4f4511004b/johnny'], function(res, errObjects){console.log(res, errObjects);});
//S3.downloadVersionedFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir/toast_file.txt', 1, function(res){console.log(res);});
