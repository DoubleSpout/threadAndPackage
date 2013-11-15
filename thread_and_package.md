#Node.js的线程和进程
早期有很多关于Node.js争论的焦点都在它的单线程模型方面，在由Jani Hartikainen写的一篇著名的文章《PHP优于Node.js的五大理由》中，更有一条矛头直接指向Node.js单线程脆弱的问题。

>如果PHP代码损坏，不会拖垮整个服务器。
 PHP代码只运行在自己的进程范围中，当某个请求显示错误时，它只对特定的请求产生影响。而在Node.js环境中，所有的请求均在单一的进程服务中，当某个请求导致未知错误时，整个服务器都会受到影响。

Node.js和Apache+PHP还有一个非常不同的地方就是进程的运行时间长短，当然这一点也被此文作为一个PHP优于Node.js的理由来写了。

>PHP进程短暂。
 在PHP中，每个进程对请求持续的时间很短暂，这就意味着你不必为资源配置和内存而担忧。而Node.js的进程需要运行很长一段时间，你需要小心并妥善管理好内存。比如，如果你忘记从全局数据中删除条目，这会轻易的导致内存泄露。

在这里我们并不想引起一次关于PHP和Node.js孰优孰劣的口水仗，PHP和Node.js各代表着一个互联网时代的开发语言，就如同我们讨论跑车和越野车谁更好一样，它们都有自己所擅长和适用的场景。
我们可以通过下面这两张图深入理解一下PHP和Node.js对处理Http请求时的区别。

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
    +---------+  +---------+  +---------+ 
    | REQUEST |  | REQUEST |  | REQUEST | 
    +---------+  +---------+  +---------+

所以你在编写Node.js代码时，要保持清醒的头脑，任何一个隐藏着的异常被触发后，都会将整个Node.js进程崩溃。但是这样的特性也为我们编写代码带来便利，比如同样要实现一个简单的网站访问次数统计，Node.js只需要在内存里定义一个变量`var count=0;`，每次有用户请求过来执行`count++;`即可。

    var http = require('http');
    var count = 0;
    http.createServer(function (request, response) {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end((++count).toString())
    }).listen(8124);
    console.log('Server running at http://127.0.0.1:8124/');

但是对于PHP来说就需要使用第三方媒介来存储这个`count`值了，比如创建一个`count.txt`文件来保存网站的访问次数。

    <?php
        $counter_file = ("count.txt");
        $visits = file($counter_file);
        $visits[0]++;
        $fp = fopen($counter_file,"w");
        fputs($fp,"$visits[0]");
        fclose($fp);
        echo "$visits[0]";
    ?>

##单线程的js
Google的`V8 Javascript`引擎已经在Chrome浏览器里证明了它的性能，所以Node.js的作者Ryan Dahl选择了`v8`作为Node.js的执行引擎，`v8`赋予Node.js高效的性能同时也注定了Node.js和大名鼎鼎Nginx一样，都是以单线程为基础的，当然这也正是作者Ryan Dahl设计Node.js的初衷。

##单线程的优缺点
Node.js的单线程具有它的优势，当然也并非十全十美，在保持单线程模型的同时，它是如何保证非阻塞的呢？

###高性能
首先，单线程避免了传统PHP那样频繁创建、切换线程的开销，使执行速度更加迅速。
第二，资源占用小，如果有对Node.js的web服务器做过压力测试的朋友可能发现，Node.js在大负荷下对内存占用仍然很低，同样的负载PHP因为一个请求一个线程的模型，将会占用大量的物理内存，很可能会导致服务器物理内存耗尽频繁交换，失去响应。

###线程安全
单线程的js还保证了绝对的线程安全，不用担心同一个变量同时被多个线程进行读写而造成的程序崩溃。比如我们之前做的web访问统计，因为单线程的绝对线程安全，所以不可能存在同时对`count`变量进行读写的情况，我们的统计代码就算是成百的并发用户请求都不会出现问题，相较PHP的那种存文件记录访问，就会面临并发同时写文件的问题。
线程安全的同时也解放了开发人员，免去了多线程编程中忘记对变量加锁或者解锁造成的悲剧。

###单线程的异步和非阻塞
Node.js是单线程的，但是它如何做到I/O的异步和非阻塞的呢？其实Node.js在底层访问I/O还是多线程的，有兴趣的朋友可以翻看Node.js的`fs`模块的源码，里面会用到`libuv`来处理I/O，所以在我们看来Node.js的代码就是非阻塞和异步形式的。

阻塞/非阻塞与异步/同步是两个不同的概念，同步不代表阻塞，但是阻塞肯定就是同步了。

举个现实生活中的例子，我去食堂打饭，我选择了A套餐，然后工作人员帮我去配餐，如果我就站在旁边，等待工作人员给我配餐，这种情况就称之为同步；若工作人员帮我配餐的同时，排在我后面的人就开始点餐，这样整个食堂的点餐服务并没有因为我在等待A套餐而停止，这种情况就称之为非阻塞。这个例子就简单说明了同步和非阻塞的情况。

再如果我在等待配餐的时候去买饮料，等听到叫号再回去拿套餐，此时我的饮料也已经买好，这样我在等待配餐的同时还执行了我买饮料的任务，叫号就等于执行了回调，这就是异步非阻塞。

###阻塞的单线程
既然Node.js是单线程异步非阻塞的，是不是我们就可以高枕无忧了呢？

还是拿上面那个买套餐的例子，如果我在买饮料的时候，已经叫我的号让我去拿套餐，可是我等了好久才拿到饮料，所以我可能在大厅叫我的餐号之后很久才拿到A套餐，这也就是单线程的阻塞情况。

在浏览器中，js都是以单线程的方式运行的，所以我们不用担心js同时执行带来的冲突问题，这对于我们编码带来很多的便利。

但是对于在服务端执行的Node.js，它可能每秒有上百个请求需要处理，对于在浏览器端工作良好的单线程js是否也能同样在服务端表现良好呢？

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

对于我们期望2秒后执行的`setTimeout`函数其实经过了`3738`毫秒之后才执行，换而言之，因为执行了一个很长的`for`循环，所以我们整个Node.js主线程被阻塞了，如果在我们处理100个用户请求中，其中第一个有需要这样大量的计算，那么其余99个就都会被延迟了。

其实虽然Node.js可以处理数以千记的并发，但是一个Node.js进程在某一时刻其实只是在处理一个请求。

###单线程和多核
线程是cpu调度的一个基本单位，一个cpu同时只能执行一个线程的任务，同样一个线程任务也只能在一个cpu上执行，所以如果你运行Node.js的机器是像i5，i7这样多核cpu，那么将无法充分利用多核cpu的性能来为Node.js服务。

##多线程
在C++、C#、python等其他服务端语言都有与之对应的多线程编程，有些时候这很有趣，带给我们灵活的编程方式；但是也可能带给我们一堆麻烦，需要学习更多的Api知识，在编写更多代码的同时也存在着更多的风险，线程的切换和锁也会造成系统资源的开销。

就像上面的那个例子，如果我们的Node.js有创建子线程的能力，那问题就迎刃而解了：

    var start = Date.now();
    createThread(function () { //创建一个子线程执行这10亿次循环
        console.log(Date.now() - start);
        for (var i = 0; i < 1000000000; i++){}
    });
    setTimeout(function () { //因为10亿次循环是在子线程中执行的，所以主线程不受影响
        console.log(Date.now() - start);
    }, 2000);

可惜也可以说可喜的是，Node.js的核心模块并没有提供这样的api给我们，我们真的不想多线程又回归回来。不过或许多线程真的能够解决我们某方面的问题。

###tagg2模块
Jorge Chamorro Bieling是`tagg(Threads a gogo for Node.js)`包的作者，他硬是利用`phread`库和C语言让Node.js支持了多线程的开发，我们看一下tagg模块的简单示例：
    
    var Threads = require('threads_a_gogo');
    function fibo(n) {
        return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
    }
    var t = Threads.create().eval(fibo);
    t.eval('fibo(35)', function(err, result) {//将fibo(35)丢入子线程运行
        if (err) throw err; //线程创建失败
        console.log('fibo(35)=' + result);//打印fibo执行35次的结果
    });
    console.log('not block');//打印信息了，表示没有阻塞

上面这段代码利用`tagg`包将`fibo(35)`这个计算丢入了子线程中进行，保证了Node.js主线程的舒畅，当子线程任务执行完毕将会执行主线程的回调函数，把结果打印到屏幕上，执行结果如下：

    not block
    fibo(35)=14930352

由于`tagg`包目前只能在`linux`下安装运行，所以我fork了一个分支，修改了部分`tagg`包的代码，发布了`tagg2`包。`tagg2`包同样具有`tagg`包的多线程功能，采用新的`node-gyp`命令进行编译，同时它跨平台支持，`mac`，`linux`，`windows`下都可以编译安装，对开发人员的api也更加友好。安装方法很简单，直接`npm install tagg2`。

一个利用`tagg2`计算斐波那契数组的http服务器代码：

    var express = require('express');
    var tagg2 = require("tagg2");
    var app = express();
    var th_func = function(){//线程执行函数，以下内容会在线程中执行
        var fibo =function fibo (n) {//在子线程中定义fibo函数
               return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
            }
        var n = fibo(~~thread.buffer);//执行fibo递归
        thread.end(n);//当线程执行完毕，执行thread.end带上计算结果回调主线程
    };
    app.get('/', function(req, res){
        var n = ~~req.query.n || 1;
        var buf = new Buffer(n.toString());
        tagg2.create(th_func, {buffer:buf}, function(err,result){
        //创建一个js线程,传入工作函数,buffer参数以及回调函数
            if(err) return res.end(err);//如果线程创建失败
            res.end(result.toString());//响应线程执行计算的结果
        })
    });
    app.listen(8124);
    console.log('listen on 8124');

其中`~~req.query.n`表示将用户传递的参数`n`取整，功能类似`Math.floor`函数。

我们用`express`框架搭建了一个web服务器，根据用户发送的参数`n`的值来创建子线程计算斐波那契数组，当子线程计算完毕之后将结果响应给客户端。由于计算是丢入子线程中运行的，所以整个主线程不会被阻塞，还是能够继续处理新请求的。

我们利用`apache`的http压力测试工具`ab`来进行一次简单的压力测试，看看执行斐波那契数组35次，100客户端并发100个请求，我们的`QPS (Query Per Second)`每秒查询率在多少。

我们的测试硬件：linux 2.6.4 4cpu 8G 64bit，网络环境是内网。

`ab`命令：

    ab -c 100 -n 100 http://192.168.28.5:8124/?n=35

压力测试结果：

    Server Software:        
    Server Hostname:        192.168.28.5
    Server Port:            8124
    
    Document Path:          /?n=35
    Document Length:        8 bytes
    
    Concurrency Level:      100
    Time taken for tests:   5.606 seconds
    Complete requests:      100
    Failed requests:        0
    Write errors:           0
    Total transferred:      10600 bytes
    HTML transferred:       800 bytes
    Requests per second:    17.84 [#/sec](mean)
    Time per request:       5605.769 [ms](mean)
    Time per request:       56.058 [ms](mean, across all concurrent requests)
    Transfer rate:          1.85 [Kbytes/sec] received

    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:        3    4   0.8      4       6
    Processing:   455 5367 599.7   5526    5598
    Waiting:      454 5367 599.7   5526    5598
    Total:        461 5372 599.3   5531    5602

    Percentage of the requests served within a certain time (ms)
      50%   5531
      66%   5565
      75%   5577
      80%   5581
      90%   5592
      95%   5597
      98%   5600
      99%   5602
     100%   5602 (longest request)

我们看到`Requests per second`表示每秒我们服务器处理的任务数量，这里是`17.84`。第二个我们比较关心的是两个`Time per request`结果，上面一行`Time per request:5605.769 [ms](mean)`表示当前这个并发量下处理每组请求的时间，而下面这个`Time per request:56.058 [ms](mean, across all concurrent requests)`表示每个用户平均处理时间，因为我们本次测试并发是100，所以结果正好是上一行的100分之1。得出本次测试平均每个用户请求的平均等待时间为`56.058 [ms]`。

另外我们看下最后带有百分比的列表，可以看到50%的用户是在`5531 ms`以内返回的，最慢的也不过`5602 ms`，响应延迟非常的平均。

我们如果用`cluster`来启动4个进程，是否可以充分利用cpu达到`tagg2`那样的`QPS`（Query Per Second ，每秒查询率）呢？我们在同样的网络环境和测试机上运行如下代码：

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

在终端屏幕上打印了4行信息：

    listen on 8124
    listen on 8124
    listen on 8124
    listen on 8124

我们成功启动了4个cluster之后，用同样的`ab`压力测试命令对8124端口进行测试，结果如下：

    Server Software:        
    Server Hostname:        192.168.28.5
    Server Port:            8124
    
    Document Path:          /?n=35
    Document Length:        8 bytes
    
    Concurrency Level:      100
    Time taken for tests:   10.509 seconds
    Complete requests:      100
    Failed requests:        0
    Write errors:           0
    Total transferred:      16500 bytes
    HTML transferred:       800 bytes
    Requests per second:    9.52 [#/sec](mean)
    Time per request:       10508.755 [ms](mean)
    Time per request:       105.088 [ms](mean, across all concurrent requests)
    Transfer rate:          1.53 [Kbytes/sec] received

    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:        4    5   0.4      5       6
    Processing:   336 3539 2639.8   2929   10499
    Waiting:      335 3539 2639.9   2929   10499
    Total:        340 3544 2640.0   2934   10504
    
    Percentage of the requests served within a certain time (ms)
      50%   2934
      66%   3763
      75%   4527
      80%   5153
      90%   8261
      95%   9719
      98%  10308
      99%  10504
     100%  10504 (longest request)

通过和上面`tagg2`包的测试结果对比，我们发现区别很大。首先每秒处理的任务数从`17.84 [#/sec]`下降到了`9.52 [#/sec]`，这说明我们web服务器整体的吞吐率下降了；然后每个用户请求的平均等待时间也从`56.058 [ms]`提高到了`105.088 [ms]`，用户等待的时间也更长了。

最后我们发现用户请求处理的时长非常的不均匀，50%的用户在`2934 ms`内返回了，最慢的等待达到了`10504 ms`。虽然我们使用了`cluster`启动了4个Node.js进程处理用户请求，但是对于每个Node.js进程来说还是单线程的，所以当有4个用户跑满了4个Node.js的`cluster`进程之后，新来的用户请求就只能等待了，最后造成了先到的用户处理时间短，后到的用户请求处理时间比较长。

###v8引擎
大家看到这里是不是开始心潮澎湃，感觉js一统江湖的时代来临了，单线程异步非阻塞的模型可以胜任大并发，同时开发也非常高效，多线程下的js可以承担cpu密集型任务，不会造成主线程阻塞而引起的性能问题。

但是，不论`tagg`还是`tagg2`包都是利用`phtread`库和`v8`的`v8::Isolate Class`类来实现js多线程功能的。

>`Isolate`代表着一个独立的`v8`引擎实例，`v8`的`Isolate`拥有完全分开的状态，在一个`Isolate`实例中的对象不能够在另外一个`Isolate`实例中使用。嵌入式开发者可以在其他线程创建一些额外的`Isolate`实例并行运行。在任何时刻，一个`Isolate`实例只能够被一个线程进行访问，可以利用加锁/解锁进行同步操作。

换而言之，我们在进行`v8`的嵌入式开发时，无法在多线程中访问js变量，这条规则将直接导致我们之前的`tagg2`里面线程执行的函数无法使用Node.js的核心api，比如`fs`，`crypto`等模块。如此看来，`tagg2`包还是有它使用的局限性，针对一些可以使用js原生的大量计算或循环可以使用`tagg2`，Node.js核心api因为无法从主线程共享对象的关系，也就不能使用了。

###libuv
最后，如果我们非要让Node.js支持多线程，还是提倡使用官方的做法，利用`libuv`库来实现。

>`libuv`是一个跨平台的异步I/O库，它主要用于Node.js的开发，同时他也被`Mozilla's Rust language`, `Luvit`, `Julia`, `pyuv`等使用。它主要包括了`Event loops`事件循环，`Filesystem`文件系统，`Networking`网络支持，`Threads`线程，`Processes`进程，`Utilities`其他工具。

在Node.js核心api中的异步多线程大多是使用`libuv`来实现的，下一章将带领大家开发一个基于`libuv`的Node.js包。

##多进程
在支持html5的浏览器里，我们可以使用`webworker`来将一些耗时的计算丢入worker进程中执行，这样主进程就不会阻塞，用户也就不会有卡顿的感觉了。在Node.js中是否也可以使用这类技术，保证主线程的通畅呢？

###cluster
`cluster`可以用来让Node.js充分利用多核cpu的性能，同时也可以让Node.js程序更加健壮，官网上的`cluster`示例已经告诉我们如何重新启动一个因为异常而奔溃的子进程。

###webworker
想要像在浏览器端那样启动worker进程，我们需要利用Node.js核心api里的`child_process`模块。`child_process`模块提供了`fork`的方法，可以启动一个Node.js文件，将它作为worker进程，当worker进程工作完毕，把结果通过`send`方法传递给主进程，然后自动退出，这样我们就利用了多进程来解决主线程阻塞的问题。

我们先启动一个web服务，还是接收参数计算斐波那契数组：

    var express = require('express');
    var fork = require('child_process').fork;
    var app = express();
    app.get('/', function(req, res){
      var worker = fork('./work_fibo.js') //创建一个工作进程
      worker.on('message', function(m) {//接收工作进程计算结果
              if('object' === typeof m && m.type === 'fibo'){
                       worker.kill();//发送杀死进程的信号
                       res.send(m.result.toString());//将结果返回客户端
              }
      });
      worker.send({type:'fibo',num:~~req.query.n || 1});
      //发送给工作进程计算fibo的数量
    });
    app.listen(8124);

我们通过express监听8124端口，对每个用户的请求都会去`fork`一个子进程，通过调用`worker.send`方法将参数n传递给子进程，同时监听子进程发送消息的`message`事件，将结果响应给客户端。

下面是被`fork`的`work_fibo.js`文件内容：

    var fibo = function fibo (n) {
       return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
    }
    process.on('message', function(m) {
    //接收主进程发送过来的消息
              if(typeof m === 'object' && m.type === 'fibo'){
                      var num = fibo(~~m.num);
                      //计算jibo
                      process.send({type: 'fibo',result:num})
                      //计算完毕返回结果        
              }
    });
    process.on('SIGHUP', function() {
            process.exit();//收到kill信息，进程退出
    });

我们先定义函数`fibo`用来计算斐波那契数组，然后监听了主线程发来的消息，计算完毕之后将结果`send`到主线程。同时还监听`process`的`SIGHUP`事件，触发此事件就自杀进程。

这里我们有一点需要注意，主线程的`kill`方法并不是真的使子进程退出，而会触发子进程的`SIGHUP`事件，真正的退出还是依靠`process.exit();`。

下面我们用`ab` 命令测试一下多进程方案的处理性能和用户请求延迟，测试环境不变，还是100个并发100次请求计算斐波那切数组第35位:

    Server Software:        
    Server Hostname:        192.168.28.5
    Server Port:            8124
    
    Document Path:          /?n=35
    Document Length:        8 bytes
    
    Concurrency Level:      100
    Time taken for tests:   7.036 seconds
    Complete requests:      100
    Failed requests:        0
    Write errors:           0
    Total transferred:      16500 bytes
    HTML transferred:       800 bytes
    Requests per second:    14.21 [#/sec](mean)
    Time per request:       7035.775 [ms](mean)
    Time per request:       70.358 [ms](mean, across all concurrent requests)
    Transfer rate:          2.29 [Kbytes/sec] received
    
    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:        4    4   0.2      4       5
    Processing:  4269 5855 970.3   6132    7027
    Waiting:     4269 5855 970.3   6132    7027
    Total:       4273 5860 970.3   6136    7032
    
    Percentage of the requests served within a certain time (ms)
      50%   6136
      66%   6561
      75%   6781
      80%   6857
      90%   6968
      95%   7003
      98%   7017
      99%   7032
     100%   7032 (longest request)

压力测试结果相比`cluster`来说，还是快了很多，每个用户请求的延迟都很平均，因为进程的创建和销毁的开销要大于线程，所以在性能方面略低于`tagg2`，不过相对于`cluster`方案，这样的提升还是令我们满意的。

###换一种思路
使用`child_process`模块的`fork`方法确实可以让我们很好的解决单线程对cpu密集型任务的阻塞问题，同时又没有`tagg2`包那样无法使用Node.js核心api的限制。

但是如果我的`worker`具有多样性，每次在利用`child_process`模块解决问题时都需要去创建一个`worker.js`的工作函数文件，有点麻烦。我们是不是可以更加简单一些呢？

在我们启动Node.js程序时，`node`命令可以带上`-e`这个参数，它将直接执行`-e`后面的字符串，如下代码就将打印出`hello world`。

    node -e "console.log('hello world')"

合理的利用这个特性，我们就可以免去每次都创建一个文件的麻烦。

    var express = require('express');
    var spawn = require('child_process').spawn;
    var app = express();
    var spawn_worker = function(n,end){
        var fibo = function fibo (n) {
          return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }
        end(fibo(n));
      }
    var spawn_end = function(result){
        console.log(result);
        process.exit();
    }
    app.get('/', function(req, res){
      var n = ~~req.query.n || 1;
      var spawn_cmd = '('+spawn_worker.toString()+'('+n+','+spawn_end.toString()+'));'
      console.log(spawn_cmd);//注意这个打印结果
      var worker = spawn('node',['-e',spawn_cmd]);
      var fibo_res = ''
      worker.stdout.on('data', function (data) {
          fibo_res += data.toString();
      });
      worker.on('close', function (code) {
          res.send(fibo_res);
      });
    });
    app.listen(8124);

代码很简单，我们主要关注3个地方。

第一、我们定义了`spawn_worker`函数，他其实就是将会在`-e`后面执行的工作函数，所以我们把计算斐波那契数组的算法定义在内，`spawn_worker`函数接收2个参数，第一个参数n表示客户请求要求计算的斐波那契数组的位数，第二个end参数是一个函数，如果计算完毕执行end，将结果传回主线程；

第二、真正当Node.js脚步执行的字符串其实就是`spawn_cmd`里的内容，它的内容我们在运行之后的打印信息一看就能明白；

第三、我们利用`child_process`的`spawn`方法，类似在命令行里执行了`node -e "js code"`，启动Node.js工作进程，同时监听子进程的标准输出，将数据保存起来，当子进程退出之后把结果响应给用户。

现在主要的焦点就是变量`spawn_cmd`到底保存了什么，我们打开浏览器在地址栏里输入：

    http://127.0.0.1:8124/?n=35

下面就是程序运行之后的打印信息，

    (function (n,end){
        var fibo = function fibo (n) {
          return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }
        end(fibo(n));
      }(35,function (result){
          console.log(result);
          process.exit();
    }));

对于在子进程执行的工作函数的两个参数n和end现在一目了然，`n`代表着用户请求的参数，期望获得的斐波那契数组的位数，而`end`参数则是一个匿名函数，在标准输出中打印计算结果然后自杀进程。

`node -e`命令虽然可以减少创建文件的麻烦，但同时它也有命令行长度的限制，这个值各个系统都不相同，我们通过命令`getconf ARG_MAX`来获得最大命令长度，例如：`MAC OSX`下是`262,144 byte`，而我的`linux`虚拟机则是`131072 byte`。

##多进程和多线程
大部分多线程解决cpu密集型任务的方案都可以用我们之前讨论的多进程方案来替代，但是有一些比较特殊的场景多线程的优势就发挥出来了，下面就拿我们最常见的http web服务器响应一个小的静态文件作为例子。

以`express`处理小型静态文件为例，大致的处理流程如下：
1、首先获取文件状态，判断文件的修改时间或者判断`etag`来确定是否响应`304`给客户端，让客户端继续使用本地缓存。
2、如果缓存已经失效或者客户端没有缓存，就需要获取文件的内容到buffer中，为响应作准备。
3、然后判断文件的`MIME`类型，如果是类似`html`，`js`，`css`等静态资源，还需要`gzip`压缩之后传输给客户端
4、最后将gzip压缩完成的静态文件响应给客户端。

下面是一个正常成功的Node.js处理静态资源无缓存流程图：

    +----+----+ 
    | 客户端  | 
    +----+----+
         | (1)用户请求静态资源，进行路由匹配   
    +----+----+ 
    | Node.js | 
    +----+----+
         | (2)fs.stat 获取文件状态，完成后回调Node.js
    +----+----+ 
    | Node.js | 
    +----+----+
         | (3)fs.read 获取文件内容，完成后回调Node.js
    +----+----+ 
    | Node.js | 
    +----+----+
         | (4)zlib.Gzip 将文件内容压缩，完成后回调Node.js
    +----+----+ 
    | Node.js | 
    +----+----+
         | (5)静态资源响应给客户端
    +----+----+ 
    | 客户端  | 
    +----+----+

这个流程中的`(2)`，`(3)`，`(4)`中都经历了从js到C++ ，打开和释放文件，还有调用了`zlib`库的`gzip`算法，其中每个异步的算法都会有创建和销毁线程的开销，所以这样也是大家诟病Node.js处理静态文件不给力的原因之一。

为了改善这个问题，我之前有利用`libuv`库开发了一个改善Node.js的http/https处理静态文件的包，名为`ifile`，`ifile`包，之所以可以加速Node.js的静态文件处理性能，主要是减少了js和C++的互相调用，以及频繁的创建和销毁线程的开销，下图是`ifile`包处理一个静态无缓存资源的流程图：

    +----+----+ 
    | 客户端  | 
    +----+----+
         | (1)用户请求静态资源   
    +----+----+ 
    | Node.js | 
    +----+----+
         | (2)将req和res对象直接丢给ifile处理
    +----+----+ 
    |C++主线程| 
    +----+----+
         | (3)创建工作子线程
    +----+----+ 
    |C++子线程| 
    +----+----+
         | (4)匹配路由，文件状态，读取文件，gzip压缩，完成之后回调c++主线程
    +----+----+ 
    |C++主线程| 
    +----+----+
         | (5)静态资源响应给客户端
    +----+----+ 
    | 客户端  | 
    +----+----+

由于全部工作都是在`libuv`的子线程中执行的，所以Node.js主线程不会阻塞，当然性能也会大幅提升了，使用`ifile`包非常简单，它能够和`express`无缝的对接。

    var express = require('express');
    var ifile = require("ifile");
    var app = express();    
    app.use(ifile.connect());  //默认值是 [['/static',__dirname]];        
    app.listen(8124);

上面这4行代码就可以让`express`把静态资源交给`ifile`包来处理了，我们在这里对它进行了一个简单的压力测试，测试用例为响应一个大小为`92kb`的`jquery.1.7.1.min.js`，测试命令：

    ab -c 500 -n 5000 -H "Accept-Encoding: gzip" http://192.168.28.5:8124/static/jquery.1.7.1.min.js

由于在`ab`命令中我们加入了`-H "Accept-Encoding: gzip"`，表示响应的静态文件希望是gzip压缩之后的，所以`ifile`将会把压缩之后的`jquery.1.7.1.min.js`文件响应给客户端。结果如下：

    Server Software:        
    Server Hostname:        192.168.28.5
    Server Port:            8124
    
    Document Path:          /static/jquery.1.7.1.min.js
    Document Length:        33016 bytes
    
    Concurrency Level:      500
    Time taken for tests:   9.222 seconds
    Complete requests:      5000
    Failed requests:        0
    Write errors:           0
    Total transferred:      166495000 bytes
    HTML transferred:       165080000 bytes
    Requests per second:    542.16 [#/sec](mean)
    Time per request:       922.232 [ms](mean)
    Time per request:       1.844 [ms](mean, across all concurrent requests)
    Transfer rate:          17630.35 [Kbytes/sec] received

    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:        0   49 210.2      1    1003
    Processing:   191  829 128.6    870    1367
    Waiting:      150  824 128.5    869    1091
    Total:        221  878 230.7    873    1921
    
    Percentage of the requests served within a certain time (ms)
      50%    873
      66%    878
      75%    881
      80%    885
      90%    918
      95%   1109
      98%   1815
      99%   1875
     100%   1921 (longest request)

我们首先看到`Document Length`一项结果为`33016 bytes`说明我们的jquery文件已经被成功的`gzip`压缩，因为源文件大小是`92kb`；其次，我们最关心的`Requests per second:542.16 [#/sec](mean)`，说明我们每秒能处理542个任务；最后，我们看到，在这样的压力情况下，平均每个用户的延迟在`1.844 [ms]`。

我们看下使用纯`express`框架处理这样的压力会是什么样的结果，`express`测试代码如下：

    var express = require('express');
    var app = express();
    app.use(express.compress());//支持gzip
    app.use('/static', express.static(__dirname + '/static'));
    app.listen(8124);

代码同样非常简单，注意这里我们使用：
 
    app.use('/static', express.static(__dirname + '/static'));

而不是：

    app.use(express.static(__dirname));

后者每个请求都会去匹配一次文件是否存在，而前者只有请求`url`是`/static`开头的才会去匹配，所以前者效率更高一些。然后我们执行相同的`ab`压力测试命令看下结果：

    Server Software:        
    Server Hostname:        192.168.28.5
    Server Port:            8124
    
    Document Path:          /static/jquery.1.7.1.min.js
    Document Length:        33064 bytes
    
    Concurrency Level:      500
    Time taken for tests:   16.665 seconds
    Complete requests:      5000
    Failed requests:        0
    Write errors:           0
    Total transferred:      166890000 bytes
    HTML transferred:       165320000 bytes
    Requests per second:    300.03 [#/sec](mean)
    Time per request:       1666.517 [ms](mean)
    Time per request:       3.333 [ms](mean, across all concurrent requests)
    Transfer rate:          9779.59 [Kbytes/sec] received

    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:        0  173 539.8      1    7003
    Processing:   509  886 350.5    809    9366
    Waiting:      238  476 277.9    426    9361
    Total:        510 1059 632.9    825    9367
    
    Percentage of the requests served within a certain time (ms)
      50%    825
      66%    908
      75%   1201
      80%   1446
      90%   1820
      95%   1952
      98%   2560
      99%   3737
     100%   9367 (longest request)

同样分析一下结果，`Document Length:33064 bytes`表示文档大小为`33064 bytes`，说明我们的gzip起作用了，每秒处理任务数从`ifile`包的`542`下降到了`300`，最长用户等待时间也延长到了`9367 ms`，可见我们的努力起到了立竿见影的作用，js和C++互相调用以及线程的创建和释放并不是没有损耗的。

但是当我在`express`的谷歌论坛里贴上这些测试结果，并宣传`ifile`包的时候，`express`的作者TJ，给出了不一样的评价，他在回复中说道：

>请牢记你可能不需要这么高等级吞吐率的系统，就算是每月百万级别下载量的npm，也仅仅每秒处理17个请求而已，这样的压力PHP也可以处理（又黑了一把php）。

确实如TJ所说，性能只是我们项目的指标之一而非全部，一味的去追求高性能并不是很明智。

`ifile`包开源项目地址：[https://github.com/DoubleSpout/ifile](https://github.com/DoubleSpout/ifile)

##总结
单线程的Node.js给我们编码带来了太多的便利和乐趣，我们应该时刻保持清醒的头脑，在写Node.js代码中切不可与PHP混淆，任何一个隐藏的问题都可能击溃整个线上正在运行的Node.js程序。

单线程异步的Node.js不代表不会阻塞，在主线程做过多的任务可能会导致主线程的卡死，影响整个程序的性能，所以我们要非常小心的处理大量的循环，字符串拼接和浮点运算等cpu密集型任务，合理的利用各种技术把任务丢给子线程或子进程去完成，保持Node.js主线程的畅通。

线程/进程的使用并不是没有开销的，尽可能减少创建和销毁线程/进程的次数，可以提升我们系统整体的性能和出错的概率。

最后请不要一味的追求高性能和高并发，因为我们可能不需要系统具有那么大的吞吐率。高效，敏捷，低成本的开发才是项目所需要的，这也是为什么Node.js能够在众多开发语言中脱颖而出的关键。

#参考文献：
- <http://smashingnode.com> Smashing Node.JS By Guillermo Rauch
- <http://bjouhier.wordpress.com/2012/03/11/fibers-and-threads-in-node-js-what-for> Fibers and Threads in node.js – what for? By Bruno's Ramblings
- <https://github.com/xk/node-threads-a-gogo> TAGG: Threads à gogo for Node.js By Jorge Chamorro Bieling
- <https://code.google.com/p/v8/> Google v8
- <https://github.com/joyent/libuv> libuv by joyent

#发布一个package
本章将带领大家一步步的开发一个基于`libuv`库、让Node.js支持多线程的包，开发并测试完成后，将发布到`npm`上供开发人员下载和使用。

##package解决的问题
在我们使用Node.js开发一些项目时，大家都会用到各种各样的Node.js包，比如我们上一章使用的`express`，`tagg2`等，都是一个个发布到`npm`上的包。

随着大家对Node.js不断的深入了解，其实会发现想要解决一些比较普遍的问题都会有对应的Node.js包，比如我们想解决编码问题就可以使用`icon-v`，我们想要一个`mysql`的连接引擎也会有`mysql`包供我们使用。

##创建package.json
几乎任何一个Node.js应用都会有`package.json`这个文件，我们之前已经介绍过它的一些主要属性了，我们想要在`npm`上创建一个包，就必须先创建一个`package.json`文件。
我们可以利用`npm init`命令，根据命令行提示一步步的初始化并创建`package.json`文件。

    {
      "name": "libuv_thread",
      "version": "0.0.0",
      "description": "A Node.js multi-thread package,using libuv lib",
      "main": "index.js",
      "scripts": {
        "test": "node ./test/test.js"
      },
      "keywords": [
        "node",
        "libuv",
        "thread"
      ],
      "author": "snoopy",
      "license": "BSD-2-Clause"
    }

一般 package.json 文件常用的有以下字段：

    - name —— 包的名称，必须是唯一的，由小写英文字母、数字和下划线组成，不能包含空格
    - description —— 包的简要说明
    - version —— 包的版本
    - author —— 包的作者
    - contributors —— 贡献者数组，数组每一项为一个包含一个贡献者资料的对象
    - dependencies —— 包的依赖，为一个对象，对象的属性为包名称，属性值为版本号
    - devDependencies —— 开发环境下的包依赖，为一个对象，对象的属性为包名称，属性值为版本号
    - keywords —— 关键字数组，通常用于搜索
    - repository —— 仓库托管地址，通常为一个包含type（仓库的类型，如：git）和 url（仓库的地址）的对象
    - main —— 包的入口文件，如不指定，则默认为根目录下的index.js或index.node
    - bin —— 可执行文件的路径
    - bugs —— 提交bug的地址
    - maintainers —— 维护者数组，数组每一项为一个包含一个维护者资料的对象
    - licenses —— 许可证数组，数组每一项为一个包含type（许可证的名称）和url（链接到许可证文本的地址）的对象

##设计package的文件目录
Node.js在调用某个包时，会首先检查包中的`package.json`文件的`main`字段，如果设置了`main`字段，就会根据`main`字段的值（包入口文件的路径）作为该包的接口，如果`package.json`或`main`字段不存在，则Node.js会尝试寻找`index.js`或`index.node`作为包的入口文件。

所以对于开发一个Node.js的包，我们首先需要定义入口文件，我们一般取名为`index.js`，在`package.json`文件中注明入口文件名：

    "main": "index.js"

这样包的使用者在他们的代码中`require`我们开发的包名，就可以使用我们在`index.js`中`export`输出的对象或者方法了。

一般js的逻辑代码我们放在`lib`目录中，所以很多包的`index.js`会有如下代码：

    module.exports = require('./lib/mongodb');//mongodb包的index.js文件

直接将`lib`文件夹下的某一个文件输出给包的使用者，包的逻辑代码在`lib`文件夹中如何组织，完全由包的开发者自由发挥了。

如果这个Node.js包还包括了部分C++代码，我们一般把这部分代码放在`src`文件目录中，如果用到第三方的C++类库，通常放在`deps`目录下。

我们开发完毕一个包，需要给开发者使用，所以我们必须编写详细而且正确无误的说明文档，那就是`readme.md`文件，它将详细的描述包的安装说明，解决的问题以及使用方法。如果有需要，最好注明代码的开源协议。

提供了详细的说明文档，我们还必须提供一些简单的例子供开发人员参考，可能有些人觉得看代码更加直观，所以一般我们把包使用的示例代码放在`example`文件夹下。

在我们的包最终要上架`npm`之前，我们还必须对它做详细的测试，这不仅是对自己的代码负责，也是对包的使用者负责，我们将会把测试代码放在`test`文件夹下，同时我们要把测试脚本的调用方法写入`package.json`，这样包的使用者只需要在包的根目录执行`npm test`，就可以运行这个包的测试用例，判断这个包是否安装成功。

    "scripts": {
            "test": "node ./test/test.js"
          },

另外如果包还支持全局的命令，我们还需要把待注册的全局命令放在`bin`目录下，例如我们执行

    npm install -g express

将会把`express`命令注册到全局命令中，在命令行执行`express`命令就相当于执行了`bin`目录下的`express`文件。

在我们准备把包发布到`npm`上之前，还有一个非常重要的文件没有创建————`.npmignore`。这个文件描述了我们过滤掉那些文件不发布到`npm`上去，一般必须过滤掉的目录就是`node_modules`。这个目录因为可能涉及到C++模块的编译，必须每次`npm install`重新创建，所以不必提交到`npm`上。同样不必提交到`npm`上的还有我们之后要介绍的`build`文件夹。

一般一个Node.js的包的根目录结构如下：

    - .gitignore —— 从 Git 库中忽略的文件清单
    - .npmignore —— 不包括在 npm 注册库中的文件清单
    - LICENSE —— 包的授权文件
    - README.md —— 以 Markdown 格式编写的 README 文件
    - bin —— 保存包可执行文件的文件夹
    - doc —— 保存包文档的文件夹
    - examples —— 保存如何使用包的实际示例的文件夹
    - lib —— 保存包代码的文件夹
    - man —— 保存包的手册页的文件夹
    - package.json —— 描述包的 JSON 文件
    - src —— 保存c/c++源文件的文件夹
    - deps —— 保存包所用到的依赖文件夹
    - test —— 保存模块测试的文件夹
    - benchmark —— 保存性能测试代码的文件夹
    - index.js —— 包的入口文件

##纯js包开发
我们现在正式开始开发一个Node.js包，利用`libuv`库编写一个Node.js多线程支持的包，类似`tagg2`，这个包会包括js部分和C++部分，它们两部分提供不同功能，js主要提供对外的`api`和一些初始化工作，C++则主要负责多线程的支持。

主要的设计思路是将js定义好的线程工作函数包装下，转换成字符串加上参数还有回调函数一起丢给`libuv`去处理，执行完毕把线程工作函数的`return`值作为回调函数参数丢回给主线程，执行回调函数，大致流程图如下：

    +----+----+ 
    |用户代码 | 
    +----+----+
         | (1)将传入参数，线程工作函数，回调函数丢给libuv_thread包js部分处理   
    +----+----+ 
    |   包    | 
    +----+----+
         | (2)合法性验证，包装线程工作函数，然后丢给libuv处理
    +----+----+ 
    |C++主线程| 
    +----+----+
         | (3)将js对象，函数字符串丢入libuv子线程，保存回调函数
    +----+----+ 
    |libuv线程| 
    +----+----+
         | (4)申请一个新的js实例运行工作函数，将该函数执行结果保存下来
    +----+----+ 
    |C++主线程| 
    +----+----+
         | (5)线程执行完毕之后，执行js主线程的回调函数，并传入运行结果作为参数
    +----+----+ 
    |用户代码 | 
    +----+----+

###入口文件
我们在包根目录创建`index.js`文件，代码如下：

    module.exports = require('./lib/libuvThread.js');

这里我们直接把`lib/libuvThread.js`的`exports`作为包的入口暴露给开发者。

###api设计
我们想要实现像`tagg2`包那样让Node.js支持多线程的包，至少需要提供给开发者编写在线程中执行的工作函数的功能，而且这个工作函数需要动态的传入参数来执行，一旦工作函数执行完毕，需要告知Node.js主线程执行的结果，是出现了错误还是获得了执行结果，所以回调函数也是必须的。

总结而言，我们命名的`libuv_thread`包需要对开发者提供一个具有接受三个参数的接口：
  
  * workFunc：开发者期望在线程中执行的工作函数，结果以`return`返回，出于简单，规定返回值必须为字符串；
  * argObject：在线程中执行的工作函数参数，出于简单，我们会将参数强制转换为字符串；
  * callback：工作函数执行完毕后执行的回调函数，具有两个参数，`error`和`result`。

###api实现
设计好包的对外接口之后，我们就开始实现它，在`lib`文件夹下，创建`libuvThread.js`文件，代码如下：

    var libuvThreadCC = require('../build/Release/uv_thread.node').libuvThreadCC;
    //这边libuvThreadCC是加载C++暴露给js调用的接口，后面会讲到，先不理会它
    module.exports = function(work, arg, cb){
      if('function' !== typeof work) throw('argument[0] must be a function');
      if('object' !== typeof arg) throw('argument[1] must be an object');
      cb = cb || function(){};
    
      arg = JSON.stringify(arg);
      work = '('+work.toString()+')('+arg+')';
      libuvThreadCC(work,cb);
    }

程序一开始我们动态的把C++插件加载进来，然后我们实现了接收三个参数的对外接口，通过对参数的一些合法性验证和包装之后，我们把包装后的`work`函数和回调函数`callback`丢到`libuvThreadCC`函数中去执行。`libuvThreadCC`下面会详细讲到，它主要实现了多线程的执行和`callback`函数的回调。

##安装node-gyp
在我们讨论`libuvThreadCC`函数之前，需要先介绍一下如何构建Node.js的C++插件。

`node-gyp`是跨平台Node.js原生C++插件的命令行构建工具，它帮我们处理了在各种不同平台上构建插件的差异，具有简单、易用、统一的接口，在各个平台上都是使用相同的命令来进行构建。在`0.8`版本之前的Node.js是使用`node-waf`来实现这个功能的，从`0.8`版本开始都将使用`node-gyp`命令。

要进行Node.js的C++插件开发就必须先安装`node-gyp`命令，我们同样可以通过`npm`来进行安装。

    $ npm install -g node-gyp

在各个平台你需要保证先安装了如下的软件：

  * Unix：
    * `python` （版本必须为`v2.7`, `v3.x.x` 是*不*支持的）
    * `make` （make命令）
    * 正确的 C/C++ 编译工具, 例如：GCC
  * Windows：
    * [Python][windows-python] （版本必须为[`v2.7.3`][windows-python-v2.7.3], `v3.x.x` 是*不*支持的)
    * Windows XP/Vista/7:
      * Microsoft Visual Studio C++ 2010 （[Express][msvc2010] 也可以使用）
      * 如果是在64位系统上构建插件，你需要 [Windows 7 64-bit SDK][win7sdk]
        * 如果安装失败，尝试将你的C++ 2010 x64&x86卸载，重新安装sdk后再安装它
      * 如果出现64-bit编译器没有安装的错误，你可以将[编译器升级到新版本，用于兼容Windows SDK 7.1]
    * Windows 8：
      * Microsoft Visual Studio C++ 2012 for Windows（[Express][msvc2012] 也可以使用）

正确安装`node-gyp`命令之后，我们就可以在命令行看到如下打印结果了：

    node-gyp -v
    v0.9.5

##创建binding.byp
`binding.byp`文件使用`json`格式字符串，它描述了如何配制一个准备构建的插件。这个文件需要放置在你的包的根目录下，类似`package.json`文件。一个简单`binding.byp`文件示例：

    {
      "targets": [
        {
          "target_name": "binding",
          "sources": [ "src/binding.cc" ]
        }
      ]
    }

`targets`表示输出的插件数组，数组中如果有多项将会输出多个插件；`target_name`表示输出插件的文件名，这个文件名将可以直接通过Node.js的`requrie`引用；`sources`表示待编译的原文件路径。`binding.byp`还有很多选项，比如`cc_flag`、`libraries`等，详情请参阅：[https://github.com/TooTallNate/node-gyp](https://github.com/TooTallNate/node-gyp)。

##c++插件包开发
本节将从构建一个简单的`hello world`插件开始，完善我们之前的`libuv_thread`包的C++代码部分，让大家熟悉整个Node.js的C++插件开发流程。

###hello wrold实例
在我们继续开发`libuv_thread`包之前，我们先看一个简单的`hello world`的例子，让大家熟悉一下C++插件的开发。我们首先创建一个`hello.cc`的文件，代码如下：

    #include <node.h>
    #include <v8.h>
    
    using namespace v8;
    
    Handle<Value> Method(const Arguments& args) {
      HandleScope scope;
      return scope.Close(String::New("world"));
    }
    
    void init(Handle<Object> exports) {
      exports->Set(String::NewSymbol("hello"),
          FunctionTemplate::New(Method)->GetFunction());
    }
    
    NODE_MODULE(hello, init)

`node.h`和`v8.h`会由`node-gyp`链接进去，所以不需制定路径直接`include`就可以了，我们定义了一个`Method`方法，将返回js字符串`world`。然后我们定义对外的`exports`输出，为`exports`对象增加了属性名是`hello`的方法。

最后通过`NODE_MODULE`将`init`和插件名`hello`连接起来，注意最后的`NODE_MODULE`没有分号，因为它不是一个函数。

然后我们创建`binding.gyp`文件，定义插件名和源文件路径：

    {
      "targets": [
        {
          "target_name": "hello",
          "sources": [ "hello.cc" ]
        }
      ]
    }

接着执行`node-gyp rebuild`命令，编译之前写好的C++插件，将会自动生成`build`文件夹，于是我们利用下面的代码加载刚刚生成的C++插件给Node.js调用，创建hello.js：

    var addon = require('./build/Release/hello');
    console.log(addon.hello()); // 'world'

执行这段Node.js程序，将会在屏幕上打印出`world`字符串，这样我们一个简单的`hello world`C++插件就开发完毕了，下面我们将开始继续开发`libuv_thread`包的多线程支持部分。

###开始编写C++插件
我们先创建`threadJobClass.h`文件，用来声明`ThreadJob`类，这个类的实例会在多个线程中用到。

    using namespace v8;
    class ThreadJob {
     public:
        char *strFunc;//保存包装的work函数字符串
        char *result;//保存work函数运行结果
        int iserr;  //work函数运行过程中是否有错误
        Persistent<Object> callback; //保存js的回调函数
        uv_work_t uv_work; //给子线程传参数的类型
        ThreadJob(){};
        ~ThreadJob(){
            delete []result;
            delete []strFunc;
            callback.Dispose();//因为是Persistent<Object>，所以需要手动释放资源
        }; 
    };

接着我们定义`libuvThreadClass.h`文件，定义一些静态方法，这些方法是实现我们`libuv_thread`包功能的主要部分。

    using namespace v8;
    class LibuvThread {
      public:
        static Handle<Value> libuvThreadCC(const Arguments& args);//C++插件和js交互的接口函数        
        static void workerCallback(uv_work_t* req);//子线程执行函数1
        static void threadWork(ThreadJob* req);//子线程执行函数2
        static void afterWorkerCallback(uv_work_t *req, int status);//子线程结束后的回调函数
        LibuvThread(){};
        ~LibuvThread(){};
    };

我们想要让js能够调用C++插件的静态函数，必须把`LibuvThread`类和js连接起来，就像之前的`hello world`例子那样，我们创建`libuvThread.cc`文件来实现这个功能。

    #include "libuvThreadClass.h"
    using namespace v8;    
    void Init(Handle<Object> target) {
      target->Set(String::NewSymbol("libuvThreadCC"),
               FunctionTemplate::New(LibuvThread::libuvThreadCC)->GetFunction());
    }
    NODE_MODULE(uv_thread, Init)

最后我们将实现这些接口，完成整个`libuv_thread`包的核心部分功能开发。

我们先实现会被js调用的`LibuvThread::libuvThreadCC`静态方法，它将接收js传入的2个参数，并且调用`libuv`的线程池，将js包装的`work`函数字符串放入子线程中去执行。

    Handle<Value> LibuvThread::libuvThreadCC(const Arguments& args){
      HandleScope scope;
      ThreadJob *t_job_p = new ThreadJob();
      String::Utf8Value v1(args[0]->ToString());
      t_job_p->strFunc = new char[strlen(*v1)+1];
      strcpy(t_job_p->strFunc,*v1);//因为跨线程，所以需要将js字符串拷贝到char数组中
      t_job_p->strFunc[strlen(*v1)] = '\0';
      t_job_p->callback = Persistent<Object>::New(args[1]->ToObject());
      t_job_p->uv_work.data = t_job_p;
      t_job_p->iserr = 0;
      int r = uv_queue_work(uv_default_loop(), &(t_job_p->uv_work), workerCallback, afterWorkerCallback);
      return scope.Close(Number::New(r)); 
    };

我们首先对`HandleScope scope`进行简单的说明。

>在`V8`中，内存分配都是在`V8`的`Heap`中进行分配的，js的值和对象也都存放在`V8`的`Heap`中。这个`Heap`由`V8`独立的去维护，失去引用的对象将会被`V8`的`GC`处理掉并重新分配给其他对象。而`Handle`即是对`Heap`中对象的引用。`V8`为了对内存分配进行管理，`GC`需要对`V8`中的所有对象进行跟踪，而对象都是用`Handle`方式引用的，所以`GC`需要对`Handle`进行管理，这样`GC`就能知道`Heap`中一个对象的引用情况，当一个对象的`Handle`引用为发生改变的时候，`GC`即可对该对象进行回收或者移动。因此，`V8`编程中必须使用`Handle`去引用一个对象，而不是直接通过C++的方式去获取对象的引用，直接通过C++的方式直接去引用一个对象，会使得该对象无法被`V8`管理。

>`Handle`分为`Local`和`Persistent`两种。从字面上就能知道，`Local`是局部的，它同时被`HandleScope`进行管理。`Persistent`，类似全局的，不受`HandleScope`的管理，其作用域可以延伸到不同的函数，局部的`Local`作用域比较小。`Persistent Handle`对象需要`Persistent::New`和`Persistent::Dispose`配对使用，类似于C++中`new`和`delete`。

>一个函数中，可以有很多Handle，而`HandleScope`则相当于用来装`Local Handle`的容器，当`HandleScope`生命周期结束的时候，`Handle`也将会被释放，会引起`Heap`中对象引用的更新。`HandleScope`是分配在栈上，不能通过`New`的方式进行创建。对于同一个作用域内可以有多个`HandleScope`，新的`HandleScope`将会覆盖上一个`HandleScope`，并对`Local Handle`进行管理。

我们先实例化`ThreadJob`类，然后保存包装过后的`work`函数以及回调函数，最后调用`uv_queue_work`启动libuv的线程池来执行`LibuvThread::workerCallback`方法。

`uv_queue_work`是`libuv`库里的方法，它表示将需要子线程执行的函数丢入到`libuv`自己管理的线程池中去执行，在完毕之后会执行回调函数。

`LibuvThread::workerCallback`静态方法是在子线程中执行的，这里我们首先创建了一个新的`v8`实例：

    void LibuvThread::workerCallback(uv_work_t* req){ //子线程中执行代码
        ThreadJob* req_p = (ThreadJob *) req->data;
        Isolate* isolate = Isolate::New();   //V8的isolate类
        if (Locker::IsActive()) {
          Locker myLocker(isolate);     
          isolate->Enter(); 
          threadWork(req_p);
        }
        else{
          isolate->Enter();
          threadWork(req_p);
        }
        isolate->Exit(); //退出 isolate
        isolate->Dispose(); //销毁 isolate
    }

因为`v8`的`Isolate`实例不是线程安全的，所以如果当前`v8`的实例使用了`Locker`，我们就得在进入新创建的`Isolate`实例前执行`Locker`操作。

`LibuvThread::threadWork`方法是将之前js包装的`work`函数进行编译和执行，然后将运行结果保存下来。同时如果在执行过程中有任何异常的抛出也需要保存下来，供最后的回调函数使用。

    void LibuvThread::threadWork(ThreadJob *req_p){//线程中执行
        HandleScope scope;
        Persistent<Context> context = Context::New(); //创建上下文
        context->Enter();
        TryCatch onError; //接受js执行抛出的异常
        String::Utf8Value *v2;
    
        Local<Value> result = Script::Compile(String::New(req_p->strFunc))->Run();
        //编译字符串，然后运行
        if (!onError.HasCaught()){ //如果没有异常
          v2 = new String::Utf8Value(result->ToString());   
        }
        else{ //如果有异常
          req_p->iserr = 1; //表示js代码执行是否有异常抛出
          Local<Value> err = onError.Exception();
          v2 = new String::Utf8Value(err->ToString());
        }
    
        req_p->result = new char[strlen(**v2)+1];
        strcpy(req_p->result,**v2);
        req_p->result[strlen(**v2)] = '\0'; //保存执行结果
        delete v2; 
        context.Dispose();//释放资源
    }

线程执行完毕之后，将会回到主线程执行`LibuvThread::afterWorkerCallback`回调函数，它的工作是将在线程中js代码的执行结果作为参数传递给之前传入的js回调函数。

    void LibuvThread::afterWorkerCallback(uv_work_t *req, int status){//子线程执行完毕
        HandleScope scope;
        ThreadJob* req_p = (ThreadJob *) req->data;
        Local<Value> argv[2];
    
        if(req_p->iserr){//如果有错误发生，则将result作为err传入回调函数
          argv[0] = String::New(req_p->result);
          argv[1] = Local<Value>::New(Null());    
        }
        else{
          argv[0] = Local<Value>::New(Null());
          argv[1] = String::New(req_p->result);
        }
        req_p->callback->CallAsFunction(Object::New(), 2, argv); 
        delete req_p;
    }

我们首先创建一个数组`argv`，判断如果发生异常，则将数组的第一个参数也就是`error`赋值，如果没有发生异常，则赋值数组的第二个参数`result`，接着将数组`argv`作为参数，执行js的回调函数。

这样我们`libuv_thread`包的代码开发部分就告一段落了，最后我们创建`binding.gyp`文件，描述编译后的文件名以及使用到的源文件：

    {
      "targets":[
        {
          "target_name": "uv_thread",//注意这里的名称必须和之前 libuvThread.cc 定义的一致
          "sources": ["src/libuvThread.cc","src/libuvThreadClass.cc"]
        }
      ]
    }

在包的根目录，我们执行命令`node-gyp rebuild`重新编译C++代码后，会在`build/release/`文件夹下生成`uv_thread.node`文件，这个文件就是我们Node.js需要`require`的。

##包的测试
在`npm`上包的数量繁多，种类也繁多，如何选择靠谱的包作为我们的开发工具是非常重要的，其中有一个重要条件就是这个包是否具有完善的测试代码。下面将为我们刚才完成的`libuv_thread`包编写测试代码。

###构思测试用例
我们的`libuv_thread`包具有线程工作的能力，可以将工作函数丢入子线程执行，当执行完毕后将运算结果回调到主线程，同时还具有当工作函数抛出异常时，主线程回调函数的第一个参数将能够接受这些异常的功能。

综上所述，我们的测试用例也基本确定了，一个正常工作的用例和一个肯定会抛出异常的用例。

###should模块
由于测试相对简单，我们这次并没有使用（强大/复杂）的`mocha`模块，而使用了相对简单的`should`模块。	

`should`模块类似于Node.js核心模块中的`assert`，断言某一种情况是否成立，安装它非常简单`npm install should`，它的简单用法如下：

    var should = require('should');
    var user = {
        name: 'tj'
      , pets: ['tobi', 'loki', 'jane', 'bandit']
    };    
    user.should.have.property('name', 'tj');
    user.should.have.property('pets').with.lengthOf(4);    
    // or without Object.prototype, for guys how did Object.create(null)
    should(user).have.property('name', 'tj');
    should(true).ok;    
    someAsyncTask(foo, function(err, result){
        should.not.exist(err);
        should.exist(result);
        result.bar.should.equal(foo);
    });

这里还列出了一些常用的`should`静态方法：

    assert.fail(actual, expected, message, operator)
    assert(value, message), assert.ok(value, [message]) 
    assert.equal(actual, expected, [message]) 
    assert.notEqual(actual, expected, [message])
    assert.deepEqual(actual, expected, [message])
    assert.notDeepEqual(actual, expected, [message])
    assert.strictEqual(actual, expected, [message])
    assert.notStrictEqual(actual, expected, [message])
    assert.throws(block, [error], [message])
    assert.doesNotThrow(block, [message])
    assert.ifError(value)

具体`should`模块的使用方法请参阅：[https://github.com/visionmedia/should.js/](https://github.com/visionmedia/should.js/)。

###编写测试代码
有了我们之前设计的测试用例和`should`模块，很容易就编写成一个简单的测试文件，我们把它保存为`./test/test.js`。

    var should = require('should');
    var thread = require('../');

    //test throw error
    var tf = function(){
      y;
    }
    thread(tf,{},function(err){
      should.equal(err, 'ReferenceError: y is not defined');
    })
    
    //test success
    var tf = function(obj){
      return ++obj.count
    }
    thread(tf,{count:0},function(err,count){
      should.equal(count, '1');
    })

我们先模拟一个必然会抛出变量`y`没有定义的异常情况，然后再模拟一个正常情况，如果测试通过Node.js进程将自动退出不抛出任何异常。

###性能测试
为包编写了单元测试代码之后，我们也想了解下`libuv_thread`包它的性能如何？和之前的`tagg2`包在同样的情况下性能是提升还是下降呢？

我们创建`benchmark/benchmark.js`文件，测试代码如下：

    var express = require('express');
    var thread = require('../');
    var app = express();
    var th_func = function(obj){
      var n = obj.n;
      var fibo =function fibo (n) { //在子线程中定义fibo函数
            return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }
        var r = fibo(n);
        return r.toString();
    }
    app.get('/', function(req, res){
      var n = ~~req.query.n || 1;
      thread(th_func, {n:n}, function(err,result){
            if(err) return res.end(err);
            res.end(result.toString());//响应线程执行计算的结果
        })
    });
    app.listen(8124);
    console.log('listen on 8124');

我们用上一章同样的`ab`命令来进行压力测试：

    ab -c 100 -n 100 http://192.168.28.5:8124/?n=35

压力测试结果如下：

    Server Software:        
    Server Hostname:        192.168.28.5
    Server Port:            8124
    
    Document Path:          /?n=35
    Document Length:        8 bytes
    
    Concurrency Level:      100
    Time taken for tests:   5.592 seconds
    Complete requests:      100
    Failed requests:        0
    Write errors:           0
    Total transferred:      10600 bytes
    HTML transferred:       800 bytes
    Requests per second:    17.88 [#/sec](mean)
    Time per request:       5591.681 [ms](mean)
    Time per request:       55.917 [ms](mean, across all concurrent requests)
    Transfer rate:          1.85 [Kbytes/sec] received
    
    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:        3    3   0.3      3       4
    Processing:   351 3038 1527.4   3065    5585
    Waiting:      351 3038 1527.4   3065    5585
    Total:        354 3041 1527.1   3068    5588
    
    Percentage of the requests served within a certain time (ms)
      50%   3068
      66%   3900
      75%   4329
      80%   4689
      90%   5165
      95%   5379
      98%   5586
      99%   5588
     100%   5588 (longest request)

根据压力测试结果，我们发现，使用我们的新包`libuv_thread`性能和之前的`tagg2`包差不多，不过因为我们利用了`libuv`库，所以开发起来代码量少了很多。

##跨平台测试
Node.js天生就是跨平台的，同样`libuv`库，`node-gyp`命令等都是跨平台支持的，当然我们开发的Node.js包也必须跨平台支持，不能拖了后腿。

跨平台测试主要还是需要到不同操作系统上进行测试，有条件当然是真机测试，`linux`，`windows`和`mac`各跑一遍，没有条件就安装`vmware`虚拟机来进行测试，也可以达到相同的效果。

在进行Node.js跨平台开发过程中，文件的目录路径是最容易出现不兼容的地方，`linux`系统下是没有类似`windows`下`c盘`，`d盘`等概念的，根目录以`/`开头，同样目录分隔符号`linux`和`windows`的斜杠也是不同的。第二个容易造成不兼容的地方是依赖的操作系统命令，比如`ls`,`ln -s`,`mkdir`等等都是在`linux`下的命令，在`windows`中是不可以使用的。第三个容易造成不兼容的地方就是在编写C++插件时编译器的不同，`linux`下的`gcc`和`windows`下的`Visual C++`是有一定区别的。

##readme.md
在发布到`npm`之前，我们需要让开发者知道我们发布上去的包是做什么用的，对开发者提供的api说明和简单的运行示例，所以在包的根目录`readme.md`说明文件必不可少。

##发布到github
`github`作为开源代码的仓库，已经被越来越多的开发者所青睐，通过将自己的代码开源在`github`上，可以让更多的人参与进来，开发新的功能或者反馈问题提交debug代码。而且将自己的开源项目放在`github`上也会有更多的机会被其他开发者搜索和使用，毕竟自己辛勤的劳动成果能够被别人所认可，也是一件很欣慰的事情。

我们可以方便的使用`github`官方开发的桌面程序来管理代码,例如`GitHub for Windows`或者`GitHub Mac`，在不同机器上随时随地的`clone`和`commit`代码。

##发布到npm
丑媳妇终要见公婆，我们辛辛苦苦写完的`libuv_thread`包终于还是要发布到`npm`上供大家下载使用的，`npm`是Node.js包的管理平台，本书之前已经做过介绍了，这里我们将把开发好的`libuv_thread`包发布到`npm`上。

在把包发布到`npm`上之前，我们需要注册一个`npm`帐号，通过命令`npm adduser`来注册，根据命令行的提示输入好用户名、密码、Email、所在地等相关信息后即可完成注册。注册成功后，我们可以在命令行中运行 `npm whoami` 查看是否取得了账号。

    npm whoami
    doublespout

随后我们进入`libuv_thread`包的根目录，执行`npm publish`命令，等待一段时间后就可以完成发布。

    npm http PUT https://registry.npmjs.org/libuv_thread
    npm http 409 https://registry.npmjs.org/libuv_thread
    npm http GET https://registry.npmjs.org/libuv_thread
    npm http 200 https://registry.npmjs.org/libuv_thread
    npm http PUT https://registry.npmjs.org/libuv_thread/-/libuv_thread-0.1.0.tgz/-rev/17-1afe1dd3c678bcb49901bc0d03253675
    npm http 201 https://registry.npmjs.org/libuv_thread/-/libuv_thread-0.1.0.tgz/-rev/17-1afe1dd3c678bcb49901bc0d03253675
    npm http PUT https://registry.npmjs.org/libuv_thread/0.1.0/-tag/latest
    npm http 201 https://registry.npmjs.org/libuv_thread/0.1.0/-tag/latest
    + libuv_thread@0.1.0

上面的打印信息表示我们成功发布了`libuv_thread`包`0.1.0`版本，随后我们可以在各个操作系统上执行`npm install libuv_thread`命令进行安装和测试。假如你对已发布的包不满意，可以使用 `npm unpublish` 来取消发布。

`libuv_thread`包的github开源项目地址：[https://github.com/DoubleSpout/nodeLibuvThread](https://github.com/DoubleSpout/nodeLibuvThread)。

##状态图标
在`github`上我们经常会在`readme.md`文件上看到有`build passing`和`npm module`这两种小图标，前者`build passing`表示此项目通过`travis-ci`网站测试，后者`npm module`表示此项目是已经提交到`npm`上的包。

生成`npm module`图标比较简单，在我们把`libuv_thread`包提交到`npm`上之后，访问网站[http://badge.fury.io](http://badge.fury.io)，在输入框中输入`libuv_thread`并提交之后就可以找到用于`MarkDown`的图标链接字符串，把它们拷贝到`readme.md`头部即可。

`build passing`图标较复杂一些，我们需要先访问[https://travis-ci.org/](https://travis-ci.org/)，将`github`帐号关联到`travis-ci`，然后根据提示到`github`上开放授权，在项目的根目录里创建`.travis.yml`文件，告诉`travis-ci`此项目是Node.js项目以及依赖的版本号。

一个`.travis.yml`文件的例子：

     language: node_js
     node_js:
       - "0.10"

我们可以在`travis-ci`官网上找到相应项目的小图标生成字符串，把它复制到`readme.md`文件中。设定完毕之后，当每次我们对`github`提交代码，都会触发`travis-ci`的测试，如果测试通过就可以在`github`上看到一个绿色`build passing`，如果测试失败会生成红色的`build error`，如果生成失败则是灰色的`build fail`。

最后我们的`libuv_thread`包有了专业的小图标：

![libuv_thread 包](http://farm8.staticflickr.com/7316/10682759766_c83aeef40a_o.png)

##总结
在开发Node.js项目时，我们一定要学会使用各种各样的包来为我们服务，这样可以大大提升开发效率。`package.json`不仅是作为包的说明配置文件，同样我们每一个Node.js项目根目录都应该包含它来作为项目的配置说明文件。

本章我们从无到有地完成了一个利用`libuv`库让Node.js支持多线程开发的`libuv_thread`包，他实现的功能与之前的`tagg2`是类似的，但是代码量却少了很多，`libuv`库确实提供了强大的功能和跨平台的便利性。

本章还介绍了一些简单的`v8`引擎的嵌入式开发，通过C++插件的支持可以让我们的Node.js拥有更多更强大的功能。比如我之前开发过一个Node.js便携式验证码包`ccap`，这个包不同于其他Node.js验证码包，需要安装很多依赖，只需要在有`node-gyp`环境的系统下`npm install ccap`就可以完成安装并投入使用了，它的工作原理也很简单，只是对图形库`CIMG`做了一个封装，让js可以调用`CIMG`库的一些api而已。

当然，并不是所有情况下C++插件都可以让Node.js有性能上的提升，因为Node.js和C++互相调用也会造成损耗，而且C++代码开发起来相比动态的js效率还是差一些的，所以能用js解决的问题尽量不要去写C++插件。

我们在开发完`libuv_thread`包后还补上了测试代码，对包的测试代码一定要写，以后就算我们有代码变动发布新版本，跑一下测试用例心里也有个底。

最后我们将开发的`libuv_thread`包发布到了`github`和`npm`上，这是个好习惯，可以让开发者方便的下载和使用我们的开源Node.js包。

#参考文献：
- <https://github.com/TooTallNate/node-gyp> node-gyp
- <https://npmjs.org> npm
- <http://stackoverflow.com/questions/9510822/what-is-the-design-rationale-behind-handlescope> what-is-the-design-rationale-behind-handlescope
- <https://code.google.com/p/v8/> Google v8
- <https://github.com/joyent/libuv> libuv by joyent
- <https://github.com/visionmedia/should.js/> shouldjs
- <http://blog.csdn.net/feiyinzilgd/article/details/8249180> Google V8编程详解（三）Handle & HandleScope

