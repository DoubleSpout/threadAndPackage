#Node.js的线程和进程
早期关于很多Node.js的争论都在于它的单线程模型方面，由Jani Hartikainen写的一篇著名的文章《PHP优于Node.js的五大理由》中更有一条矛头直接指向单线程脆弱的问题。

>如果PHP代码损坏，不会拖垮整个服务器
 PHP代码只运行在自己的进程范围中，当某个请求显示错误时，它只对特定的请求产生影响。而在Node.js环境中，所有的请求均在单一的 进程服务器中，当某个请求导致未知错误时，整个服务器都会受到影响。

当然Node.js和Apache+PHP还有一个非常不同地方就是进程的运行时长短，当然这一点也被此文作为一个PHP由于Node.js的理由来写了。

>PHP进程短暂
 在PHP中每个进程对请求持续的时间很短暂，这就意味着你不必为资源配置和内存而担忧。而Node.js在进程过程中需要运行很长一段时间，你需要小心并妥善管理好内存。比如，如果你忘记从全局数据中删除条目，这会轻易的导致你将内存泄露。

在这里我们并不想引起一次关于PHP和Node.js孰优孰劣的口水仗，PHP和Node.js各代表着一个互联网开发语言的时代，就像我们讨论轿车和越野车谁更好一样，都有它们所擅长和适用的场景。
我们可以通过下面这两张图方便理解PHP和Node.js对处理Http请求时的区别。

PHP的模型：

        +---------------------+ 
        |        APACHE       | 
        +-+--------+--------+-+ 
        |          |          | 
    +---+          |          +---+ 
    +----+----+ +----+----+ +----+----+ 
    | PHP     | | PHP     | | PHP     |
    |         | |         | |         |
    | THREAD  | | THREAD  | | THREAD  | 
    +----+----+ +----+----+ +----+----+ 
     |           |           | 
    +---------+ +---------+ +---------+ 
    | REQUEST | | REQUEST | | REQUEST | 
    +---------+ +---------+ +---------+ 

Node.js的模型：

    +-----------------------------------+ 
    |                                   | 
    |                                   | 
    |             NODE.JS               | 
    |                                   | 
    |             PROCESS               | 
    |                                   | 
    |                                   | 
    |                                   | 
    +----+------------+------------+----+ 
         |            |            | 
    +---------+ +---------+ +---------+ 
    | REQUEST | | REQUEST | | REQUEST | 
    +---------+ +---------+ +---------+

所以你在编写Node.js代码时要保持清醒的头脑，任何一个隐藏着的异常被触发后，都会将整个Node.js进程崩溃。当然这也为我们编写代码带来便利，比如同样要实现一个简单的网站访问次数统计，Node.js只需要在内存里定义一个`var count=0;`变量，每次有用户请求过来执行`count++;`即可。

###相关代码相关代码相关代码相关代码

但是对于PHP来说就需要使用第三方媒介来存储这个`count`值了，比如创建一个`count.txt`文件来保存网站的访问次数。

###相关代码相关代码相关代码相关代码

##单线程的js
Google的V8 Javascript引擎已经在Chrome浏览器里证明了它的性能，所以Node.js的作者Ryan Dahl选择了v8作为Node.js的执行引擎，v8赋予Node.js高效的性能同时也注定了Node.js和和大名鼎鼎Nginx一样，都是以单线程作为基础的，而且这样正是作者Ryan Dahl设计Node.js的初衷。

##单线程的优缺点
Node.js的单线程具有它的优势，同时并非十分完美，在保持单线程模型的同时他是如何保证非阻塞呢？

###高性能
首先，单线程避免了传统PHP那样频繁创建、切换线程的开销，使执行速度更加迅速。
第二，资源占用小，如果有对Node.js的web服务器做过压力测试的朋友可能发现，Node.js在大负荷下对内存占用任然很低，同样的负载PHP因为一个请求一个线程的模型，将会占用大量的物理内存，很可能会导致服务器物理内存耗尽频繁交换，失去响应。

###线程安全
单线程的js还保证了绝对的线程安全，不用担心同一个变量同时被多个线程进行读写从而造成的程序崩溃。就比如我们之前做的web访问统计，因为单线程的绝对线程安全，所以不可能存在同时对`count`变量进行读写的情况，所以我们的统计代码就算是成百的并发用户请求都不会出现问题。
线程安全同时也解放了开发人员，免去了多线程编程中忘记对变量加锁或者解锁造成的悲剧。

###单线程的异步和非阻塞
Node.js是单线程的，但是它如何做到I/O的异步和非阻塞的呢？其实Node.js在其底层访问I/O还是多线程的，有兴趣的朋友可以翻看Node.js的fs模块的源码，里面会用到libuv来处理I/O。所以在我们看来Node.js的代码就是非阻塞和异步形式的。

阻塞/非阻塞和异步/同步是两个不通的概念，同步不代表阻塞，但是阻塞肯定就是同步了。

举个现实生活中的例子吧，我去食堂打饭，我选择了鸡翅套餐然后工作人员帮我去打了，这时我就站在旁边等工作人员配好鸡翅套餐给我了，这时我是同步的等待工作人员配菜，同时排在我后面的人开始点餐，他想要一个大排套餐，这时整个食堂点餐并没有因为我在等待鸡翅套餐而停止营业阻塞掉，这个例子就简单说明了同步和非阻塞的情况。

如果我在等待鸡翅套餐的时候去买饮料了，当鸡翅套餐配好后广播里叫了我的号让我去取，这时我再去拿鸡翅套餐，这样我继续执行了我买饮料的任务，广播叫我号之后就相当于执行了回调，所以就是异步非阻塞了。

###阻塞的单线程
既然Node.js是单线程异步非阻塞的，是不是我们就可以高枕无忧了呢？

还是拿上面那个买鸡翅套餐的例子，如果我在买饮料的时候，大厅叫我的号让我去拿鸡翅套餐了，可是买饮料的人在调饮料时很慢，我等了好久才拿到饮料，而且因为买饮料的地方和拿鸡翅套餐的地方比较远，所以我可能在大厅叫我鸡翅套餐号之后很久才拿到了我的鸡翅套餐，这也就是单线程的阻塞情况。

在浏览器中，js都是以单线程的方式运行的，所以我们不用担心js同时执行的带来的冲突问题，这对于我们编码方面带来很多的便利性。

但是对于在服务端执行的Node.js它可能每秒有上百个请求需要处理，对于在浏览器端工作良好的单线程js是否也能同样在服务端表现良好呢？

我们看如下代码：

    var start = Date.now();
    setTimeout(function () {
        console.log(Date.now() - start);
        for (var i = 0; i < 1000000000; i++){

        }
        }, 1000);
    setTimeout(function () {
        console.log(Date.now() - start);
    }, 2000);

最终我们的打印结果是（结果可能因为你的机器而不同）：

    1000
    3738

对于我们期望的2秒之后执行的`setTimeout`函数其实经过了`3738`毫秒之后执行了，换而言之因为执行了一个很长的`for`循环，所以我们整个Node.js主线程被阻塞了，如果在我们处理100个用户请求中，其中第一个有需要这样大量的计算，那么其余99个就都会被延迟了。

其实虽然Node.js可以处理数以千记的并发，但是一个Node.js进程某一时刻其实只是在处理一个请求。

###单线程和多核
线程是cpu调度的一个基本单位，一个cpu同时只能执行一个线程的任务，同样一个线程任务也只能在一个cpu上执行，所以如果你运行Node.js的机器是例如i5，i7等多核cpu，那么将无法充分的利用多核cpu的性能来为Node.js服务。

##多线程
在C++、C#、python等其他服务端语言都有与之对应的多线程编程，有些时候这很有趣，带给我们灵活的编程方式；但是也可能带给我们一堆麻烦，需要学习更多的Api知识，在编写更多代码代码的同时也存在着更多的风险，线程的切换和锁也会造成系统资源的开销。

不过就像上面的那个例子，如果我们的Node.js有创建子线程的能力，那个问题就可以这么解决了：

    var start = Date.now();
    createThread(function () { //创建一个子线程执行这10亿次循环
        console.log(Date.now() - start);
        for (var i = 0; i < 1000000000; i++){}
    });
    setTimeout(function () { //因为10亿次循环是在子线程中执行的，所以主线程不受影响
        console.log(Date.now() - start);
    }, 2000);

可惜也可以说可喜的是Node.js的核心模块并没有提供这样的api给我们，我们真的不想好不容易从Node.js中剔除的多线程又回归回来。

不过或许多线程真的能够解决我们某方面的问题。

###tagg2模块
Jorge Chamorro Bieling是tagg(Threads a gogo for Node.js)模块的作者，他硬是利用phread库和C语言让Node.js支持了多线程的开发，我们看一下tagg模块的简单示例：
    
    var Threads = require('threads_a_gogo');
    var t = Threads.create();
    function fibo(n) {
        return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
    }
    t.eval('fibo(40)', function(err, result) {//将fibo(40)丢入子线程运行
        if (err) throw err; //线程创建失败
        console.log('fibo(40)=' + result);//打印fibo执行40次的结果
    });
    console.log('not block');//打印信息了，表示没有阻塞

上面这段代码利用tagg模块将`fibo(40)`这个计算丢入了子线程中进行，保证了Node.js主线程的舒畅，当子线程任务执行完毕将会执行主线程的回调函数，将结果打印到屏幕，执行结果如下：

##执行结果

由于tagg模块目前只能在linux下安装运行，所以我fork了一个分支，修改了部分tagg模块的代码，发布了tagg2模块。tagg2模块同样具有tagg模块的多线程功能，同时它跨平台支持，mac，linux，windows都可以编译安装，对开发人员的api也更加友好。安装方法很简单，直接`npm install tagg2`。

一个利用tagg2计算斐波那契数组的http服务器代码：

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

我们利用express框架搭建了一个web服务器，根据用户发送请求参数`n`的值来创建子线程计算斐波那契数组，当子线程计算完毕之后将结果响应给客户端。由于计算是丢入子线程中运行的，所以整个主线程的不会被阻塞还是能够继续处理新的来源过来。

我们利用apache的http压力测试工具`ab`来进行一次简单的压力测试，看看执行斐波那契数组40次，100并发100个请求，我们的`QPS`每秒处理任务数在多少个。

我们的测试硬件：linux 2.6.4 4cpu 8G 64bit，网络环境内网。

`ab`命令：

    ab -c 100 -n 100 http://192.168.28.5/?n=40

压力测试结果：

##压力测试结果压力测试结果压力测试结果压力测试结果

我们如果用cluster来启动4个进程，是否可以充分利用cpu达到tagg2那样的`QPS`呢？我们在同样的网络环境和测试机上运行如下代码：

    var cluster = require('cluster');
    var numCPUs = require('os').cpus().length;
    if (cluster.isMaster) {
      for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
    } else {
        var express = require('express');
        var app = express();
        var fibo = function fibo (n) {
           return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }
        app.get('/', function(req, res){
          var n = fibo(~~req.query.n || 1);
          res.send(n.toString());
        });
        app.listen(8124);
        console.log('listen on 8124');
    }

我们可以看到，在终端屏幕上打印了4行信息：

    listen on 8124
    listen on 8124
    listen on 8124
    listen on 8124

我们成功启动了4个cluster之后，用同样的`ab`压力测试命令对8124端口进行测试，结果如下：

##压力测试结果压力测试结果压力测试结果压力测试结果




###v8引擎

###libuv


##多进程

###cluster


###webworker


###改善webworker


#发布package


##package解决的问题


##创建package.json


##设计package的文件和目录

##纯js包开发

###入口文件

###api设计

###api实现


##安装node-gyp


##创建binding.byp


##c++插件包开发


###hello wrold实例


###定义交互接口


###开始编写c++插件


##包的测试


###构思测试用例


###should和muk模块


###编写测试代码


##readme.md制作


###说明


###安装方法


###api介绍


###开源协议


##发布到npm


##发布到github


##测试跨平台



#参考文献：
- <http://smashingnode.com> Smashing Node.JS By Guillermo Rauch
- <http://bjouhier.wordpress.com/2012/03/11/fibers-and-threads-in-node-js-what-for> Fibers and Threads in node.js – what for? By Bruno's Ramblings
- <https://github.com/xk/node-threads-a-gogo> TAGG: Threads à gogo for Node.js By Jorge Chamorro Bieling