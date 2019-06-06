/*
AWS S3 유저 파일시스템 접근 모듈

현재 상태
1. 버전관리 적용 아직 안됨
2. 유저 파일 시스템 경로는 userId/ (유저의 root 디렉토리)
3. 유저 휴지통 경로는 trashcan/userId/
4. trashcan/ 이하 경로의 모든 파일은 30일 이후 자동 삭제 규칙 적용
*/

var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-2'});

// 테스트용 상수
var TEST_BUCKET_NAME = '2016104141-test-bucket';
var TEST_USER_NAME = 'test1';
var TEST_SOURCE_FILE = 'test_file.txt';
var DOWNLOAD_DIR = './public/modules/s3/download';
var DELETE_FILE_LIST = [{Key: 'rsa.h'}, {Key: 'sdes.h'}];

var s3 = new AWS.S3({apiVersion:'2006-03-01'});
var fs = require('fs');
var path = require('path');

/* 
함수 사용 메뉴얼
1. 모든 함수는 버킷 이름, 유저 아이디, callback 함수를 공통 파라미터로 가진다.
2. 모든 파일 또는 디렉토리 파라미터는 문자열 양 끝 단에 '/' 기호를 제외하고 입력한다. ex1) 'temp/user.txt' (o) '/temp/user.txt' (x) ex2) 'temp/src' (o) 'temp/src/' (x)
3. 모든 파일 또는 디렉토리 파라미터는 유저의 입장에서 입력한다. ('temp/user.txt' 입력 시 실제 파일 경로는 'userId/temp/user.txt')
3. s3 응답 요청에 소요되는 시간이 있어 비동기적인 수행을 위해 본 js 파일의 모든 함수는 파라미터로 callback 함수를 받는다.
4. 모든 함수의 callback 함수는 첫 번째 파라미터에 성공(1) 및 실패(0) 여부 값을 전달한다.
5. 모든 GET 함수의 callback 함수는 두 번째 파라미터에 GET하고자 하는 데이터를 전달한다.
6. 실패 시 오류 내용은 서버 콘솔 로그에 기록된다.
7. DeleteFiles (복수 파일 삭제) 함수 이용 시 targetFiles 파라미터 형식은 다음과 같다.
[{Key: 'example/file1.txt'}, {Key: 'example/file2.txt'}, {Key: 'example/file3.txt'}]
*/

/*var crypto = require('crypto');
const key = "cloud_computing";

exports.cryptoHash = function(pw){*/

// 신규 유저를 위한 파일 시스템 생성 (폴더 userId/ 및 trashcan/userId/ 생성)
//function userInit(bucketName, userId, callback) {
var S3 = {
	TEST_BUCKET_NAME: TEST_BUCKET_NAME,
	s3: s3,
	fs: fs,
	path: path,
	
	userInit: function(bucketName,userId, callback){
		var params = {
			Bucket: bucketName,
			Key: userId + '/',
		};

		s3.putObject(params, function(err, data) {
			var result;
			if (err) {
				console.log("User Init Error on Making User Directory", err);
				result = 0;
			} if (data) {
				params.Key = 'trashcan/' + userId + '/';
				s3.putObject(params, function(err, data) {
					if (err) {
						console.log("User Init Error on Making Trashcan Directory");
						result = 0;
					}
				});
				console.log("User Init Success");
				result = 1;
			}
			callback(result);
		});
	},


	// 유저의 특정 폴더 내 모든 파일 및 폴더 목록 접근
	getFileList: function (bucketName, userId, targetPath, callback) {
		console.log("getfilelist");
		var bucketParams = {
			Bucket : bucketName,
			Prefix: userId + '/' + targetPath
		};

		s3.listObjects(bucketParams, function(err, data) {
			var result;
			if (err) {
				console.log("List Error", err);
				result = 0;
			} if (data) {
				console.log("List Success");
				result = 1;
			}
			callback(result, data);
		});
	},

	// 유저의 파일 시스템에 단일 파일 업로드 (서버로부터)
	//exports.uploadFile=function(uploadParams,callback){
	uploadFile: function(bucketName, userId, sourceFile, targetPath, callback) {
		var result;
		var fileStream = fs.createReadStream(sourceFile);
		fileStream.on('error', function(err) {
			console.log('File Error', err);
			//result = 0;
			throw err;
			//return callback(result);
		});
		var uploadParams = {
			Bucket: bucketName,
			Key: userId + '/' + targetPath + '/' + path.basename(sourceFile),
			Body: fileStream
		};

		s3.upload(uploadParams, function(err, data) {
			var result;
			if (err) {
				console.log("Upload Error", err);
				result = 0;
			} if (data) {
				console.log("Upload Success", data.Location);
				result = 1;
			}
			callback(result);
		});
	},

	// 유저의 파일 시스템에서 단일 파일 영구 삭제
	deleteFile: function(bucketName, userId, targetFile, callback) {
		var deleteParams = {
			Bucket: bucketName,
			Key: userId + '/' + targetFile
		};

		s3.deleteObject(deleteParams, function(err, data) {
			var result;
			if (err) {
				console.log("Delete Error", err);
				result = 0;
			} if (data) {
				console.log("Delete Success");
				result = 1;
			}
			callback(result);
		});
	},

	// 유저의 파일 시스템에서 복수 파일 영구 삭제
	deleteFiles: function(bucketName, userId, targetFiles, callback) {
		targetFiles.forEach(function(item, idx, arr) {
			item.Key = userId + '/' + item.Key;
		});

		var deleteParams = {
			Bucket: bucketName,
			Delete: {
				Objects: targetFiles,
				Quiet: false
			}
		};

		s3.deleteObjects(deleteParams, function(err, data) {
			var result;
			if (err) {
				console.log("Delete Files Error", err);
				result = 0;
			} if (data) {
				console.log("Delete Files Success");
				result = 1;
			}
			callback(result);
		});
	},

	// 복수 파일 영구 삭제 (본 소스코드 내부에서만 호출)
	deleteFilesAdmin: function(bucketName, targetFiles, callback) {
		var deleteParams = {
			Bucket: bucketName,
			Delete: {
				Objects: targetFiles,
				Quiet: false
			}
		};

		s3.deleteObjects(deleteParams, function(err, data) {
			var result;
			if (err) {
				console.log("Delete Files or Folders Error", err);
				result = 0;
			} if (data) {
				console.log("Delete Files or Folders Success");
				result = 1;
			}
			callback(result);
		});
	},

	// 유저의 파일 시스템에서 폴더 생성
	createPath: function(bucketName, userId, targetPath, callback) {
		var params = {
			Bucket: bucketName,
			Key: userId + '/' + targetPath + '/',
		};

		s3.putObject(params, function(err, data) {
			var result;
			if (err) {
				console.log("Create Path Error", err);
				result = 0;
			} if (data) {
				console.log("Create Path Success");
				result = 1;
			}
			callback(result);
		});
	},

	// 유저의 파일 시스템에서 단일 폴더 삭제 (폴더 내의 모든 파일 및 폴더들을 삭제한다.)
	deletePath: function(bucketName, userId, targetPath, callback) {
		console.log("deletepath");
		S3.getFileList(bucketName, userId, targetPath, function(res, data) {
			var result;
			if (!res) {
				console.log("Delete Path Error on Fetching File List");
				result = 0;
			} else {
				var object = data.Contents;
				var fileList = [];
				var pathList = [];
				for (var idx = 0; idx < object.length; idx++) {
					var objectName = object[idx].Key;
					if (objectName.charAt(objectName.length - 1) != '/') {
						fileList.push({Key: objectName});	// 파일 리스트에 파일 추가
					} else { 
						pathList.push({Key: objectName});	// 폴더 리스트에 폴더 추가
					}
				}
				if (fileList.length != 0) {	// 폴더 하위의 파일이 존재하는 경우: 파일 먼저 삭제 후 폴더 삭제
					S3.deleteFilesAdmin(bucketName, fileList, function(res) {	// 폴더 하위의 모든 파일 삭제
						if (!res) {
							console.log("Delete Path Error on Deleting Files");
							result = 0;
						} else {
							S3.deleteFilesAdmin(bucketName, pathList, function(res) {	// 폴더 하위의 모든 폴더 삭제
								if (!res) {
									console.log("Delete Path Error on Deleting Folders");
									result = 0;
								} else {
									console.log("Delete Path Success");
									result = 1;
								}
							});
						}
					});
				} else {	// 폴더 하위의 파일이 존재하지 않는 경우: 바로 폴더 삭제
					S3.deleteFilesAdmin(bucketName, pathList, function(res) {	// 폴더 하위의 모든 폴더 삭제
						if (!res) {
							console.log("Delete Path Error on Deleting Folders");
							result = 0;
						} else {
							console.log("Delete Path Success");
							result = 1;
						}
					});
				}
			}
			callback(result);
		});
	},

	// 유저의 파일 시스템에서 단일 파일 복제
	copyFile: function(bucketName, userId, sourceFile, targetPath, callback) {
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/' + userId + '/' + sourceFile,
			Key: userId + '/' + targetPath + '/' + path.basename(sourceFile)
		};
		s3.copyObject(copyParams, function(err, data) {
			var result;
			if (err) {
				console.log("Copy Error", err);
				result = 0;
			} if (data) {
				console.log("Copy Success");
				result = 1;
			}
			callback(result);
		});
	},

	// 유저의 파일 시스템에서 단일 파일 이동 (복제 및 삭제)
	
	moveFile: function(bucketName, userId, sourceFile, targetPath, callback) {
		copyFile(bucketName, userId, sourceFile, targetPath, function(result) {
			if (!result) {
				console.log("Move Error on Copying File");
				callback(result);
			} else {
				deleteFile(bucketName, userId, sourceFile, function(result) {
					if (!result) {
						console.log("Move Error on Deleting File");
						callback(result);
					}
				});
			}
		});
	},

	// 유저의 파일 시스템에서 단일 파일 다운로드 (서버로)
	downloadFile: function(bucketName, userId, sourceFile, callback) {
		var downParams = {
			Bucket: bucketName,
			Key: userId + '/' + sourceFile
		};
		// var file = fs.createWriteStream(DOWNLOAD_DIR + '/' + path.basename(sourceFile));
		// s3.getObject(downParams).createReadStream().pipe(file);
		s3.getObject(downParams, function(err, data) {
			var result;
			if (err) {
				console.log("Get File Error", err);
				result = 0;
			} if (data) {
				console.log("Get File Success");
				fs.writeFileSync(DOWNLOAD_DIR + '/' + path.basename(sourceFile), data.Body.toString());
				result = 1;
			}
			callback(result);
		});
	},

	// 유저의 파일 시스템에서 휴지통으로 단일 파일 이동 (trashcan/userId/ 로 이동)
	disposeFile: function(bucketName, userId, sourceFile, callback) {
		var copyParams = {
			Bucket: bucketName,
			CopySource: bucketName + '/' + userId + '/' + sourceFile,
			Key: 'trashcan/' + userId + '/' + path.basename(sourceFile)
		};
		s3.copyObject(copyParams, function(err, data) {
			var result;
			if (err) {
				console.log("Dispose File Error on Copying File", err);
				result = 0;
			} if (data) {
				deleteFile(bucketName, userId, sourceFile, function(result) {
					if (!result) {
						console.log("Dispose File Error on Deleting File");
						result = 0;
					}
				});
				console.log("Dispose File Success");
				result = 1;
			}
			callback(result);
		});
	},
	
	multipartUpload: function(multipartParams , buffer, callback){
		var startTime = new Date();
  		var partNum = 0;
  		var partSize = 1024 * 1024 * 5; // 5mb chunks except last part
  		var numPartsLeft = Math.ceil(buffer.length / partSize);
  		var maxUploadTries = 3;
  		var multipartMap = {
    		Parts: []
  		};
		
		s3.createMultipartUpload(multipartParams, function(err, multipart) {
    	if (err) {
			return console.error('Error!', err);
		}
    		console.log('Got upload ID', multipart.UploadId);
		
    	for (var start = 0; start < buffer.length; start += partSize) {
      		partNum++;
      		var end = Math.min(start + partSize, buffer.length);
      		var partParams = {
        		Body: buffer.slice(start, end),
        		Bucket: multipartParams.Bucket,
        		Key: multipartParams.Key,
        		PartNumber: String(partNum),
        		UploadId: multipart.UploadId
      		};
      		console.log('Uploading part: #', partParams.PartNumber, ', Start:', start);
      		uploadPart(s3, multipart, partParams);
    	}
  	});

	function completeMultipartUpload (s3, doneParams) {
    s3.completeMultipartUpload(doneParams, function(err, data) {
      if (err) return console.error('An error occurred while completing multipart upload');
      var delta = (new Date() - startTime) / 1000;
      console.log('Completed upload in', delta, 'seconds');
      console.log('Final upload data:', data);
    	});
  	}

  	function uploadPart (s3, multipart, partParams, tryNum) {
    	var tryNum = tryNum || 1;
    s3.uploadPart(partParams, function(multiErr, mData) {
      console.log('started');
      if (multiErr) {
        console.log('Upload part error:', multiErr);

        if (tryNum < maxUploadTries) {
          console.log('Retrying upload of part: #', partParams.PartNumber);
          S3.uploadPart(s3, multipart, partParams, tryNum + 1);
        } else {
          console.log('Failed uploading part: #', partParams.PartNumber);
        }
        // return;
      }

      multipartMap.Parts[this.request.params.PartNumber - 1] = {
        ETag: mData.ETag,
        PartNumber: Number(this.request.params.PartNumber)
      };
      console.log('Completed part', this.request.params.PartNumber);
      console.log('mData', mData);
      if (--numPartsLeft > 0) return; // complete only when all parts uploaded

      var doneParams = {
        Bucket: multipartParams.Bucket,
        Key: multipartParams.Key,
        MultipartUpload: multipartMap,
        UploadId: multipart.UploadId
      };

      console.log('Completing upload...');
      completeMultipartUpload(s3, doneParams);
	});
  	}
		callback(1);
	}
};


module.exports = S3;

//사용예
//S3.getFileList(TEST_BUCKET_NAME, TEST_USER_NAME, '', function(result, data){console.log(result, data);});
//S3.uploadFile(TEST_BUCKET_NAME, TEST_USER_NAME, TEST_SOURCE_FILE, 'test_dir', function(result){console.log(result);});
//S3deleteFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_file.txt', function(result){console.log(result);});
//S3deleteFiles(TEST_BUCKET_NAME, TEST_USER_NAME, DELETE_FILE_LIST, function(result){console.log(result);});
//S3createPath(TEST_BUCKET_NAME, TEST_USER_NAME, 'new_folder', function(result){console.log(result);});
//S3copyFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_file.txt', 'new_folder', function(result){console.log(result);});
//S3moveFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_file.txt', 'new_folder', function(result){console.log(result);});
//S3disposeFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'new_folder/test_file.txt', function(result){console.log(result);});
//S3deletePath(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir', function(result){console.log(result);});
//S3createPath(TEST_BUCKET_NAME, TEST_USER_NAME, 'test_dir', function(result){console.log(result);});
//S3downloadFile(TEST_BUCKET_NAME, TEST_USER_NAME, 'trashcan/test_file.txt', function(result, data){console.log(result);});
