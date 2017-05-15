/**
 * Created by wang on 2017/4/6.
 */
window.onload = function() {
    //创建并且初始化Go_Chatting原型实例
    var gochatting = new Go_Chatting();
    gochatting.init();
}

//定义gochatting类
var Go_Chatting = function() {
    this.socket = null;
}

//向原型添加业务方法
Go_Chatting.prototype = {
    init: function() { // 初始化程序
        var that = this;
        //建立到server的socket连接
        this.socket = io.connect();
        //监听socket的connect事件（此事件表示连接已建立）
        this.socket.on('connect', function() {
            //连接到server成功后，显示登录框
            document.getElementById('info').textContent = "Set a nickname for yourself:";
            document.getElementById('nickWrapper').style.display = "block";
            document.getElementById('nicknameInput').focus(); //该对象获得焦点
        });
        //显示昵称被占用
        this.socket.on('nickExisted', function() {
            document.getElementById("info").textContent = "nickname is being taken, please choose another one!"
        });
        this.socket.on('loginSuccess', function() {
            document.title = "Go Chatting | " + document.getElementById("nicknameInput").value;
            document.getElementById("loginWrapper").style.display = "none"; //遮罩消失显示聊天界面
            document.getElementById("messageInput").focus(); //消息框获得焦点
        });
        this.socket.on('system', function(nickName, userCount, type) {
            //判断用户连接与否并显示通知
            var msg = nickName + (type == 'login' ? ' joined' : ' left');
            //指定系统消息显示为红色
            that._displayNewMsg('system', msg, 'red');
            document.getElementById('status').textContent = userCount + (userCount > 1 ? ' users' : ' user') + ' online';
        });
        this.socket.on('newMsg', function(user, msg, color) {
            that._displayNewMsg(user, msg, color);
        });
        //图片发送
        this.socket.on('newImg', function(user, img) {
            that._displayImage(user, img);
        });
        this._initialEmoji();

        //表情发送
        //单击表情按钮显示表情
        document.getElementById('emoji').addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            emojiwrapper.style.display = 'block';
            e.stopPropagation();
        }, false);
        //单机页面其余地方关闭表情窗口
        document.body.addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            if (e.target != emojiwrapper) {
                emojiwrapper.style.display = 'none';
            }
        });
        //选中表情后
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
            //获取被点击的表情
            var target = e.target;
            if (target.nodeName.toLowerCase() == 'img') {
                var messageInput = document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
            }
        }, false);
        //昵称设置
        document.getElementById("loginBtn").addEventListener("click", function() {
            var nickName = document.getElementById("nicknameInput").value;
            //检查昵称输入是否为空 (.trim方法是将数据两端空格去除)
            if (nickName.trim().length != 0) {
                //不为空则发起login事件并将输入的昵称发送到服务器
                that.socket.emit("login", nickName);
            } else {
                //否则输入框获得焦点
                document.getElementById("nicknameInput").focus();
            }
        }, false);
        //发送消息
        document.getElementById('sendBtn').addEventListener('click', function() {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value;
            //获取用户选取的颜色值
            color = document.getElementById('colorStyle').value;
            messageInput.value = '';
            messageInput.focus();
            if (msg.trim().length != 0) {
                that.socket.emit('postMsg', msg, color); //把消息发送到服务器
                that._displayNewMsg('me', msg, color); //把自己的消息显示到自己的窗口中
            }
        }, false);
        //发送图片
        document.getElementById('sendImage').addEventListener('change', function() {
            if (this.files.length != 0) {
                //获取文件并且用FileReader进行读取
                var file = this.files[0],
                    reader = new FileReader();
                if (!reader) {
                    that._displayNewMsg('system', 'your browser doesn\'t support FileReader', 'red');
                    this.value = '';
                    return;
                }
                reader.onload = function(e) {
                    //读取成功就显示页面并发送到服务器
                    this.value = '';
                    that.socket.emit('img', e.target.result);
                    that._displayImage('me', e.target.result);
                }
                reader.readAsDataURL(file);
            }
        }, false);
        //按键操作，使用户可以通过键盘回车键确认信息
        document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
            if (e.keyCode == 13) {
                var nickName = document.getElementById('nicknameInput').value;
                if (nickName.trim().length != 0) {
                    that.socket.emit('login', nickName);
                }
            }
        }, false);
        document.getElementById('messageInput').addEventListener('keyup', function(e) {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            if (e.keyCode == 13 && msg.trim().length != 0) {
                messageInput.value = '';
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('me', msg, color);
            }
        }, false);
        //clear清屏功能(注意必须从后面往前面删，因为节点一个一个删，i增加，但是节点实际下标在变小)
        document.getElementById('clearBtn').addEventListener('click', function () {
            var container = document.getElementById('historyMsg'),
                childs = container.childNodes;
            for (var i = childs.length-1; i>=0; i--){
                container.removeChild(childs[i]);
            }
        }, false);
    },

    //向Go_Chatting类添加一个发送消息的_displayNewMsg方法
    _displayNewMsg: function(user, msg, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        //将消息中的表情转成图片
        msg = this._showEmoji(msg);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },

    //发送图片_displayImage方法
    _displayImage: function(user, imgData, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '"target="_blank"><img src=" ' + imgData + ' "/></a> ';
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },

    //初始化表情包，将所有表情添加到页面中
    _initialEmoji: function() {
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();
        for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../content/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        }
        emojiContainer.appendChild(docFragment);

    },

    //处理表情
    _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1); //只匹配数字
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');
            }

        }
        return result;
    }


}
