let express = require('express');
let socket = require('socket.io');
let app = express();

let server = app.listen(4242, function () {
    console.log("server is running on port 4242");
});

let io = socket(server);

app.get('/', function (req, res) {
    res.send('<h1>IRC SERVER</h1>');
});

const clientList = {};

const groups = {};

// class to init user after connection
class ClientConnection {
    constructor(socket) {
        this.socket = socket;
        this.nick = null;
        this.group = null;
    }

    get id() {
        return this.socket.id;
    }

    send(data) {
        this.socket.emit("RECEIVE_MESSAGE", data);
    }

}

const GROUP_TIMEOUT = 5 * 60000;
// update on every action
const requestUpdate = () => {
    //loop on object clientlist  to update clients
    Object.keys(clientList).forEach(id => {
        const client = clientList[id];
        client.socket.emit('UPDATE');
    });
};

class Group {
    constructor(name, client) {
        this.name = name;
        this.users = [];
        this.time = new Date();
        this.admin = client.id;
        this.check_alive(); //delete or not ( group )
        this.join(client); // adds admin to group
    }

    check_alive() {
        setTimeout(() => {
            const currentTime = new Date();
            const diff = currentTime - this.time;
            if (diff > GROUP_TIMEOUT) {
                this.delete();
                return;
            }
            this.check_alive();
        }, GROUP_TIMEOUT);
    }

    //deletes group and refresh group list on the left
    delete() {
        delete groups[this.name];
        Object.keys(clientList).forEach(id => {
            const client = clientList[id];
            client.socket.emit('RECEIVE_GROUPS', Object.keys(groups));
        });
        //refresh message group list and user list
        requestUpdate();
    }

    join(clientConnection) {
        // join client on group
        clientConnection.group = this.name;
        if (this.hasUser(clientConnection))
            // if user already there does nothing
            return;
        this.time = new Date();
        if (this.users.length === 0)
            this.admin = clientConnection.id;
        this.users.push(clientConnection);
        this.notifyAll(`${clientConnection.nick} joined`);
        this.notifyUpdate();
    }

    leave(clientConnection) {
        if (!this.hasUser(clientConnection))
            return;
        this.time = new Date();
        this.notifyAll(`${clientConnection.nick} left`);
        const id = clientConnection.id;
        // filters id list and keeps only users who do not have the deleted's one id.
        this.users = this.users.filter(c => c.id !== id);
        //if leaver is admin- > next user = admin
        if (this.admin === id)
            this.admin = this.users[0].id;
        // set group = null
        clientConnection.group = null;
        this.notifyUpdate();
    }

    // user sends message to whole group
    send(clientConnection, msg) {
        this.time = new Date();
        const data = `${clientConnection.nick}: ${msg}`;
        this.users.forEach(user => {
            console.log(`Sending: ${data}`);
            user.send({group: this.name, msg: data});
        })
    }


// sends uptade to everyone on the group
    notifyUpdate() {
        this.users.forEach(user => {
            user.socket.emit('UPDATE');
        })
    }

// send message to everyone on the group
    notifyAll(msg) {
        this.users.forEach(user => {
            user.socket.emit('RECEIVE_MESSAGE', {group: this.name, msg: msg})
        })
    }

// checks if user is already in current group
    hasUser(clientConnection) {
        const users = this.users.map(user => user.id);
        return users.includes(clientConnection.id);
    }

//whisper to 1 person
    msg(clientConnection, nickname, msg) {
        console.log(`msg: ${nickname}, ${msg}`);
        const data = `${clientConnection.nick} : ${msg}`;
        clientConnection.socket.emit('RECEIVE_MESSAGE', {group: this.name, msg: data});
        this.users.forEach(user => {
            if (user.nick === nickname) {
                user.socket.emit('RECEIVE_MESSAGE', {group: this.name, msg: data});
            }
        });
    }

    isAdmin(client) {
        if (this.users.length === 0)
            return true;
        return this.admin === client.id;
    }
}

const createGroup = (name, client) => {
    if (groups[name])
        return;
    groups[name] = new Group(name, client);
}
//new client connection to group
const handleClient = socket => {
    const client = new ClientConnection(socket);
    clientList[client.id] = client;
    socket.on('SEND_MESSAGE', data => {
        if (!data)
            return;
        if (data[0] === '/') {
            let command = data.substr(1, data.indexOf(' '));
            if (!command)
                command = data.substr(1, data.length); // entire message as command
            command = command.toLocaleLowerCase().trim();
            const message = data.indexOf(' ') > 0 ? data.substr(data.indexOf(' ') + 1) : "";
            let group = groups[client.group]; //current group of client
            console.log(command, message, (group || {name: ''}).name);
            switch (String(command)) {
                case "nick":
                    const old_nick = clientList[client.id].nick;
                    clientList[client.id].nick = message;
                    socket.emit('RECEIVE_NICK', message);
                    Object.keys(groups).forEach(name => {
                        let group = groups[name];
                        if (group.hasUser(client)) {
                            group.notifyAll(`${old_nick} changed username to ${message}`);
                            group.notifyUpdate();
                        }
                    });
                    break;
                case "create":
                    createGroup(message, client);
                    requestUpdate();
                case "list":
                    socket.emit('RECEIVE_GROUPS', Object.keys(groups));
                    break;
                case "delete":
                    if (group && group.isAdmin(client)) {
                        group.delete();
                    }
                    break;
                case "join":
                    group = groups[message];
                    if (group)
                        group.join(client);
                case "users":
                    if (group) {
                        socket.emit('RECEIVE_USERS', group.users.map(user => user.nick));
                    }
                    break;
                case "part":
                    if (groups[message])
                        groups[message].leave(client);
                    socket.emit('RECEIVE_USERS', []);
                    break;
                case "msg":
                    const spaceIndex = message.indexOf(' ');
                    const nickname = message.substr(0, spaceIndex).trim();
                    const msg = message.substr(spaceIndex)
                    if (group)
                        group.msg(client, nickname, msg);
                    break
                case "cg":
                    client.send(group.name)
            }
        } else {
            const group = groups[client.group];
            if (group) {
                group.send(client, data);
            }
        }
    });
};

io.on('connection', handleClient);