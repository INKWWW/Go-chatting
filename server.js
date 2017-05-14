/**
 * Created by wang on 2017/4/7.
 */
//设置昵称--服务器及页面部分
var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    users = []; //保存所有在线用户的昵称
//app.use([path], function)
//Use the given middleware function, with optional mount path, defaulting to "/"
app.use('/', express.static(__dirname + '/main')); //指定静态HTML的位置
// 屏蔽本地端口
//server.listen(80);
//打开部署到heroku的端口
server.listen(process.env.PORT || 3000);

//socket部分
io.on('connection', function (socket) {  //此处socket表示当前连接到服务器的那个客户端
   //昵称设置
    socket.on('login', function (nickname) {
        if (users.indexOf(nickname) > -1){
            socket.emit("nickExisted");   //只有自己会收到这个事件通知
        }else{
            socket.userIndex = users.length;
            socket.nickname = nickname;
            users.push(nickname);
            socket.emit('loginSuccess');
            //向所有连接到服务器的客户端发送当前登录用户的昵称。因为io表示服务器整个socket连接
            io.sockets.emit('system', nickname, users.length, 'login');
        }
    });

    //用户离开
    socket.on('disconnct', function () {
        users.splice(socket.userIndex, 1);
        socket.broadcast.emit('system', socket.nickname, users.length, 'logout');
    });

    //接受新消息
    socket.on('postMsg', function (msg, color) {
        //将消息分发到出自己以外的所有用户
        socket.broadcast.emit('newMsg', socket.nickname, msg, color);
    });

    //接受用户发送的图片
    socket.on('img', function (imgData) {
        //通过一个newImg事件分发图片到每个用户
        socket.broadcast.emit('newImg',socket.nickname, imgData);
    });


});

