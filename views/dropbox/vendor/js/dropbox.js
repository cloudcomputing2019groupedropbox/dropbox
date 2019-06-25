// $(document).ready(function () {
//     console.log("ee");
//     var obj = $("#file_div_id");
//     console.log(obj);
//     obj.on('dragenter', function (e) {
//         e.stopPropagation();
//         e.preventDefault();
//         $(this).css('border', '4px solid #22A6F2');
//         $(this).css('border-radius', '4px');
//         console.log("dragenter");
//     });

//     obj.on('dragleave', function (e) {
//         e.stopPropagation();
//         e.preventDefault();
//         $(this).css('border', 'none');
//         console.log("dragleave");
//     });

//     obj.on('dragover', function (e) {
//         e.stopPropagation();
//         e.preventDefault();
//         console.log("dragover");
//     });

//     obj.on('drop', function (e) {
//         e.preventDefault();
//         $(this).css('border', 'none');
//         console.log("drop");
//         var files = e.originalEvent.dataTransfer.files;
//         if (files.length < 1)
//             return;
//         console.log(files);
//     });
// });
// 파일 멀티 업로드
function F_FileMultiUpload(files, obj) {
    var data = new FormData();
    for (var i = 0; i < files.length; i++) {
        data.append('file', files[i]);
    }

    var url = "<서버 파일업로드 URL>";
    $.ajax({
        url: url,
        method: 'post',
        data: data,
        dataType: 'json',
        processData: false,
        contentType: false,
        success: function (res) {
            F_FileMultiUpload_Callback(res.files);
        }
    });
}

// 파일 멀티 업로드 Callback
function F_FileMultiUpload_Callback(files) {
    alert("업로드가 완료되었습니다.");
    for (var i = 0; i < files.length; i++)
        console.log(files[i].file_nm + " - " + files[i].file_size);
}

