var express = require('express');
var tagg2 = require("tagg2")
var app = express();
var th_func = function(){//线程执行函数，以下内容会在线程中执行
    var fibo =function fibo (n) { //在子线程中定义fibo函数
           return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }
  var n = fibo(~~thread.buffer); //执行fibo递归
  thread.end(n);//当线程执行完毕，执行thread.end带上计算结果回调主线程
}
app.get('/', function(req, res){
  var n = ~~req.query.n || 1;
  var buf = new Buffer(n.toString());
  tagg2.create(th_func, {buffer:buf}, function(err,result){
  //创建一个js线程,传入工作函数,buffer参数以及回调函数
        if(err) res.end(err);//当线程创建失败
        res.end(result.toString());//响应线程执行计算的结果
    })
});
app.listen(8124);
console.log('listen on 8124');