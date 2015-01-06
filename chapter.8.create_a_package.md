#发布一个package
##前言
合理使用Node.js的包能够解决很多问题，本章将带领大家一步步开发一个基于`libuv`库让Node.js支持多线程的名为`libuv_thread`包，开发并测试完成后，我们将它发布到`npm`上供其他开发人员下载和使用。

在学习本章之前，读者需要有`C++`语法基础；对`libuv`库和`v8`引擎的嵌入式开发有所了解；熟悉Node.js的基本模块用法。

##Node.js包解决的问题
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

一个`package.json`文件通常有以下字段：

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
Node.js在调用某个包时，会首先检查包中的`package.json`文件的`main`字段，如果设置了`main`字段，就会根据`main`字段的值（包入口文件的路径）作为该包的入口，如果`package.json`的`main`字段不存在，则Node.js会尝试寻找`index.js`或`index.node`作为包的入口文件。

所以对于开发一个Node.js的包，我们首先需要定义入口，一般取名为`index.js`，在`package.json`文件中注明入口文件：

    "main": "index.js"

这样包的使用者在他们的代码中`require`我们开发的包名，就可以使用我们在`index.js`中`export`输出的对象或者方法了。

一般js的逻辑代码我们放在`lib`目录中，所以很多包的`index.js`文件会有如下代码：

    module.exports = require('./lib/mongodb');//mongodb包的index.js文件

直接将`lib`文件夹下的某一个文件输出给包的使用者，包的逻辑代码在`lib`文件夹中如何组织，完全由包的开发者自由发挥了。

如果这个Node.js包还包括了部分C/C++代码，我们一般把这部分代码放在`src`文件目录中，如果用到第三方的C/C++类库，通常放在`deps`目录下。

我们开发完毕一个包，需要给开发者使用，所以我们必须编写详细而且正确无误的说明文档，那就是`readme.md`文件，它将详细的描述包的安装说明，解决的问题以及使用方法。如果有需要，最好注明代码的开源协议。

提供了详细的说明文档，我们还必须提供一些简单的例子供开发人员参考，可能有些人觉得看代码更加直观，所以一般我们把包使用的示例代码放在`example`文件夹下。

在我们的包最终要上架`npm`之前，我们还必须对它做详细的测试，这不仅是对自己的代码负责，也是对包的使用者负责，我们将会把测试代码放在`test`文件夹下，同时我们要把测试脚本的调用方法写入`package.json`，这样包的使用者只需要在包的根目录执行`npm test`，就可以运行这个包的测试用例，判断这个包是否安装成功。

    "scripts": {
            "test": "node ./test/test.js"
          },

另外如果包还支持全局的命令，我们还需要把待注册的全局命令放在`bin`目录下，例如我们执行

    npm install -g express

将会把`express`命令注册到全局命令中，在命令行执行`express`命令就相当于执行了`bin`目录下的`express`文件。

在我们准备把包发布到`npm`上之前，还有一个非常重要的文件没有创建——`.npmignore`。这个文件描述了我们过滤掉那些文件不发布到`npm`上去，一般必须过滤掉的目录就是`node_modules`。这个目录因为可能涉及到C/C++模块的编译，必须每次`npm install`重新创建，所以不必提交到`npm`上。同样不必提交到`npm`上的还有我们之后要介绍的`build`文件夹。

一般一个Node.js的包的根目录结构如下：

    - .gitignore —— 从Git仓库中忽略的文件清单
    - .npmignore —— 不包括在npm注册库中的文件清单
    - LICENSE —— 包的授权文件
    - README.md —— 以Markdown格式编写的README文件
    - bin —— 保存包可执行文件的文件夹
    - doc —— 保存包文档的文件夹
    - examples —— 保存如何使用包的实际示例的文件夹
    - lib —— 保存包代码的文件夹
    - man —— 保存包的手册页的文件夹
    - package.json —— 描述包的JSON文件
    - src —— 保存C/C++源文件的文件夹
    - deps —— 保存包所用到的依赖文件夹
    - test —— 保存模块测试的文件夹
    - benchmark —— 保存性能测试代码的文件夹
    - index.js —— 包的入口文件

##纯js包开发
我们现在正式开始开发一个Node.js包，利用`libuv`库编写一个Node.js多线程支持的包，类似`tagg2`，我们命名它为`libuv_thread`。

这个包会包括js部分和C++部分，它们两部分提供不同功能，js主要提供对外的`api`和一些初始化工作，C++则主要负责多线程的支持。

主要的设计思路是将js定义好的线程工作函数经过包装、转换成字符串加上参数还有回调函数一起丢给`libuv`去处理，执行完毕把线程工作函数的`return`值作为回调函数参数丢回给主线程，执行回调函数，大致流程图如下：

![libuv thread](http://farm4.staticflickr.com/3777/10973175145_a867fc2a01_o.png)

###入口文件
我们在包根目录创建`index.js`文件，代码如下：

    module.exports = require('./lib/libuvThread.js');

这里我们直接把`lib/libuvThread.js`的`exports`作为包的入口暴露给开发者。

###api设计
我们想要实现像`tagg2`包那样让Node.js支持多线程的包，至少需要提供给开发者编写在线程中执行的工作函数的功能，而且这个工作函数需要动态的传入参数来执行，一旦工作函数执行完毕，需要告知Node.js主线程执行的结果，是出现了错误还是获得了结果，所以回调函数也是必须的。

总结而言，我们命名的`libuv_thread`包需要对开发者提供一个具有接受三个参数的接口：
  
  * workFunc：开发者期望在线程中执行的工作函数，结果以`return`返回，出于简单，规定返回值必须为字符串；
  * argObject：在线程中执行的工作函数参数，出于简单，我们会将参数强制转换为字符串；
  * callback：工作函数执行完毕后的回调函数，具有两个参数，`error`和`result`。

###api实现
设计好包的对外接口之后，我们就开始实现它，在`lib`文件夹下，创建`libuvThread.js`文件，代码如下：

    var libuvThreadCC = require('../build/Release/uv_thread.node').libuvThreadCC;
    //这边libuvThreadCC是加载C++暴露给js调用的接口，后面会讲到，先不理会它
    module.exports = function(work, arg, cb){
      //进行合法性判断
      if('function' !== typeof work) throw('argument[0] must be a function');
      if('object' !== typeof arg) throw('argument[1] must be an object');
      cb = cb || function(){};  
      arg = JSON.stringify(arg);//字符串化传入参数
      work = '('+work.toString()+')('+arg+')';//拼接工作函数
      libuvThreadCC(work,cb);//工作函数和回调函数丢入C++方法中执行
    }

程序一开始我们动态的把C++插件加载进来，然后我们实现了接收三个参数的对外接口，通过对参数的一些合法性验证和包装之后，我们把包装后的`work`函数和回调函数`callback`丢到`libuvThreadCC`方法中去执行。关于`libuvThreadCC`下面会详细讲到，它主要实现了多线程的执行和`callback`函数的回调。

##安装node-gyp
在我们讨论`libuvThreadCC`函数之前，需要先介绍一下如何构建Node.js的C/C++插件。

`node-gyp`是跨平台Node.js原生C/C++插件的命令行构建工具，它帮我们处理了在各种不同平台上构建插件的差异，具有简单、易用、统一的接口，在各个平台上都是使用相同的命令来进行构建。在`0.8`版本之前的Node.js是使用`node-waf`来实现这个功能的，从`0.8`版本开始都将使用`node-gyp`命令。

要进行Node.js的C/C++插件开发就必须先安装`node-gyp`命令，我们同样可以通过`npm`来进行安装。

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

>建议在`windows`环境的开发者最好都安装下`vs2010`。

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

##C++插件包开发
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

`node.h`和`v8.h`会由`node-gyp`链接进去，所以不需指定路径直接`include`就可以了，我们定义了一个`Method`方法，将返回js字符串`world`。然后我们定义对外的`exports`输出，为`exports`对象增加了属性名是`hello`的方法。

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

执行这段Node.js程序，将会在屏幕上打印出`world`字符串，我们一个简单的`hello world`C++插件就开发完毕了，下面我们将开始继续开发`libuv_thread`包的多线程支持部分。

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
      int r = uv_queue_work(uv_default_loop(), &(t_job_p->uv_work), workerCallback, afterWorkerCallback);//调用libuv的uv_queue_work方法
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
          isolate->Enter();//进入实例
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

`LibuvThread::threadWork`方法是将之前js包装的`work`函数进行编译和执行，然后将运行结果保存下来。同时如果在执行过程中有任何异常的抛出也需要保存下来，供最后的回调函数使用：

    void LibuvThread::threadWork(ThreadJob *req_p){//线程中执行
        HandleScope scope;
        Persistent<Context> context = Context::New(); //创建上下文
        context->Enter();//进入上下文
        TryCatch onError; //接受js执行抛出的异常
        String::Utf8Value *v2;
    
        Local<Value> result = Script::Compile(String::New(req_p->strFunc))->Run();
        //编译字符串，然后运行
        if (!onError.HasCaught()){ //如果没有异常
          v2 = new String::Utf8Value(result->ToString());   
        }
        else{ //如果有异常
          req_p->iserr = 1; //表示js代码执行是否有异常抛出
          Local<Value> err = onError.Exception();//记录异常
          v2 = new String::Utf8Value(err->ToString());
        }
    
        req_p->result = new char[strlen(**v2)+1];
        strcpy(req_p->result,**v2);//拷贝结果字符串的值
        req_p->result[strlen(**v2)] = '\0'; //保存执行结果
        delete v2;//删除v2指针
        context.Dispose();//释放资源
    }

线程执行完毕之后，将会回到主线程执行`LibuvThread::afterWorkerCallback`回调函数，它的工作是把在线程中js代码的执行结果作为参数传递给之前传入的js回调函数。

    void LibuvThread::afterWorkerCallback(uv_work_t *req, int status){//子线程执行完毕
        HandleScope scope;
        ThreadJob* req_p = (ThreadJob *) req->data;//类型转换
        Local<Value> argv[2];
    
        if(req_p->iserr){//如果有错误发生，则将result作为err传入回调函数
          argv[0] = String::New(req_p->result);//第一个参数是error字符串
          argv[1] = Local<Value>::New(Null());    
        }
        else{//如果没有发生错误
          argv[0] = Local<Value>::New(Null());//第一个参数null
          argv[1] = String::New(req_p->result);//第二个参数是运行结果
        }
        req_p->callback->CallAsFunction(Object::New(), 2, argv);//执行js回调函数
        delete req_p;//释放资源
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

在包的根目录，我们执行命令`node-gyp rebuild`重新编译C++代码后，会在`build/release/`文件夹下生成`uv_thread.node`文件，这个文件就是我们Node.js需要动态`require`的。

##包的测试
在`npm`上包的数量繁多，种类也繁多，如何选择靠谱的包作为我们的开发工具是非常重要的，其中有一个重要条件就是这个包是否具有完善的测试代码。下面将为我们刚才完成的`libuv_thread`包编写测试代码。

###构思测试用例
我们的`libuv_thread`包具有线程工作的能力，可以将工作函数丢入子线程执行，当执行完毕后将运算结果回调到主线程，同时还具有当工作函数抛出异常时，主线程回调函数的第一个参数将能够接受这些异常的功能。

综上所述，我们的测试用例也基本确定了，一个正常工作的用例和一个肯定会抛出异常的用例。

###should模块
由于测试相对简单，我们这次并没有使用（强大/复杂）的`mocha`包作为测试框架，而使用了相对简单的`should`包。	

`should`包类似于Node.js核心模块中的`assert`，断言某一种情况是否成立，安装它非常简单`npm install should`，它的简单用法如下：

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

具体`should`包的使用方法请参阅：[https://github.com/visionmedia/should.js/](https://github.com/visionmedia/should.js/)。

###编写测试代码
有了我们之前设计的测试用例和`should`包，很容易就编写成一个简单的测试文件，我们把它保存为`./test/test.js`。

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

在进行Node.js跨平台开发过程中，文件的目录路径是最容易出现不兼容的地方，`linux`系统下是没有类似`windows`中`c盘`，`d盘`等概念的，根目录以`/`开头，同样目录分隔符号`linux`和`windows`的斜杠也是不同的。第二个容易造成不兼容的地方是依赖的操作系统命令，比如`ls`,`ln -s`,`mkdir`等等都是在`linux`下的命令，在`windows`中是不可以使用的。第三个容易造成不兼容的地方就是在编写C++插件时编译器的不同，`linux`下的`gcc`和`windows`下的`Visual C++`是有一定区别的。

##readme.md
在发布到`npm`之前，我们需要让开发者知道我们发布上去的包是做什么用的，对开发者提供的api说明和简单的运行示例，所以在包的根目录`readme.md`说明文件和`examples`文件夹必不可少。

##发布到github
`github`作为开源代码的仓库，已经被越来越多的开发者所青睐，通过将自己的代码开源在`github`上，可以让更多的人参与进来，开发新的功能或者反馈问题提交debug代码。而且将自己的开源项目放在`github`上也会有更多的机会被其他开发者搜索和使用，毕竟自己辛勤的劳动成果能够被别人所认可，也是一件很欣慰的事情。

我们可以方便的使用`github`官方开发的桌面程序来管理代码,例如`GitHub for Windows`或者`GitHub Mac`，在不同机器上随时随地的`clone`和`commit`代码。

##发布到npm
丑媳妇终要见公婆，我们辛辛苦苦写完的`libuv_thread`包终于还是要发布到`npm`上供大家下载使用的，`npm`是Node.js包的管理平台，本书之前已经做过介绍了，这里我们将把开发好的`libuv_thread`包发布到`npm`上。

在把包发布到`npm`上之前，我们需要注册一个`npm`帐号，通过命令`npm adduser`来注册，根据命令行的提示输入好用户名、密码、Email、所在地等相关信息后即可完成注册。注册成功后，我们可以在命令行中运行 `npm whoami` 查看是否取得了账号。

    npm whoami
    doublespout

随后我们进入`libuv_thread`包的根目录，执行`npm publish`命令，等待一段时间后就完成了发布。

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

`build passing`图标较复杂一些，我们需要先访问[https://travis-ci.org/](https://travis-ci.org/)，将`github`帐号关联到`travis-ci`，然后根据提示，在`github`上开放授权，在项目的根目录里创建`.travis.yml`文件，告诉`travis-ci`此项目是Node.js项目以及依赖的版本号。

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

