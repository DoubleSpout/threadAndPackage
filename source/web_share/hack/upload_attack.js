var http = require('http');
var fs = require('fs');
var options = {
  hostname: '127.0.0.1',
  port: 8124,
  path: '/upload',
  method: 'POST'
};

var request = http.request(options, function(res) {
});
var boundaryKey = Math.random().toString(16); // 随机分割字符串
request.setHeader('Content-Type', 'multipart/form-data; boundary="'+boundaryKey+'"');
//设置请求头，这里需要设置上面生成的分割符
request.write( 
  '--' + boundaryKey + '\r\n'
  //在这边输入你的mime文件类型
  + 'Content-Type: application/octet-stream\r\n' 
  //"name"input框的name
  //"filename"文件名称
  + 'Content-Disposition: form-data; name="myfile"; filename="../hack.txt"\r\n'
  + 'Content-Transfer-Encoding: binary\r\n\r\n' 
);
fs.createReadStream('./222.txt', { bufferSize: 4 * 1024 })
  .on('end', function() {
    //加入最后的分隔符
    request.end('\r\n--' + boundaryKey + '--'); 
  }).pipe(request) //管道发送文件内容