import React from "react";
import io from "socket.io-client";
import {Emojione} from 'react-emoji-render';

class Chat extends React.Component {
    constructor(props) {
        super(props);

        this.groupsMessages = {};

        this.state = {
            username: props.nick,
            message: '',
            messages: [],
            groups: [],
            users: [],
            currentGroup: null
        };

        this.socket = io('10.34.6.12:4242');

        this.socket.on('UPDATE', () => {
            console.log('update');
            this.refresh();
        });

        this.socket.on('RECEIVE_MESSAGE', function (data) {
            addMessage(data);
        });

        this.socket.on('RECEIVE_NICK', nick => {
            this.setState({username: nick});
        });

        this.socket.on('RECEIVE_GROUPS', groups => {
            console.log(groups);
            if (!groups.includes(this.state.currentGroup))
                this.setState({currentGroup: null});
            this.setState({groups: groups});
        });

        this.socket.on('RECEIVE_USERS', users => {
            console.log(users);
            this.setState({users: users});
        });
        //emit sends output to client
        this.socket.emit('SEND_MESSAGE', `/NICK ${this.state.username}`);
        this.socket.emit('SEND_MESSAGE', `/LIST`);

        const addMessage = data => {
            console.log(data);
            let msg = (data.msg || data);
            msg = msg.includes(":") ? msg.split(':') : ['', msg];
            msg = {
                author: msg[0],
                message: msg[1]
            };
            let messages = [...this.state.message, msg];
            const group = data.group || this.state.currentGroup;
            if (group) {
                if (!this.groupsMessages[group])
                    this.groupsMessages[group] = [];
                this.groupsMessages[group].push(msg);
                messages = this.groupsMessages[this.state.currentGroup] || [];
            } else {
                console.log('no group!')
            }
            console.log(messages);
            this.setState({
                messages: messages
            });
            console.log(this.state.messages);
        };

        this.sendMessage = () => {
            this.socket.emit('SEND_MESSAGE', this.state.message);
            this.setState({message: ''});
        }

    }

    clearMessages = () => {
        this.setState({messages: []});
    };

    changeUsername = e => {
        e.preventDefault();
        console.log("change username");
    };

    connectGroup = group => {
        console.log(`Connect to ${group}`);
        this.setState({currentGroup: group});
        this.clearMessages();
        this.socket.emit('SEND_MESSAGE', `/JOIN ${group}`);
        this.socket.emit('SEND_MESSAGE', `/USERS`);
        if (!this.groupsMessages[group])
            this.groupsMessages[group] = [];
        this.setState({
            messages: this.groupsMessages[group]
        });
    };

    leaveGroup = group => {
        console.log(`leave ${group}`);
        this.socket.emit('SEND_MESSAGE', `/PART ${group}`);
        this.clearMessages();
        this.setState({currentGroup: null});
    };

    refresh = () => {
        console.log('refresh');
        this.socket.emit('SEND_MESSAGE', `/LIST`);
        this.socket.emit('SEND_MESSAGE', `/USERS`);
    };

    createGroup = name => {
        this.socket.emit('SEND_MESSAGE', `/create ${name}`);
    };

    render() {
        const {username, currentGroup} = this.state;
        return (
            <div>
                <div className="title">{currentGroup ? currentGroup : 'Global'} Chat</div>
                <div>
                    <span className="username">Username: {username}</span>
                    <a href="#" onClick={this.changeUsername}>
                        change
                    </a>
                </div>
                <hr/>
                <div className="chat-container">
                    <div className="groups-list">
                        <div>
                            <input type="text" placeholder="Group name" onKeyDown={e => {
                                if (e.key === 'Enter') this.createGroup(e.target.value);
                            }}/>
                        </div>
                        {this.state.groups.map((group, i) => {
                            if (currentGroup === group) {
                                return (<div key={i}>
                                    <span className="group-label">{group}</span>
                                    <a href="#" onClick={e => {
                                        e.preventDefault();
                                        this.leaveGroup(group);
                                    }}>leave</a>
                                </div>)
                            }
                            return (<div key={i}>
                                <span className="group-label">{group}</span>
                                <a href="#" onClick={e => {
                                    e.preventDefault();
                                    this.connectGroup(group);
                                }}>join</a>
                            </div>)
                        })}
                    </div>
                    <div className="chat-content">
                        <div className="messages">
                            {this.state.messages.map((message, i) => {
                                return (
                                    <div className="user">{message.author}
                                    <Emojione  key={i} text={message.message}></Emojione>
                                        </div>
                                )
                            })}
                        </div>
                        <br/>
                        <input type="text" placeholder="Message" className="form-control"
                               value={this.state.message}
                               onKeyDown={e => {
                                   if (e.key === 'Enter') this.sendMessage()
                               }}
                               onChange={ev => this.setState({message: ev.target.value})}/>
                        <br/>
                        <button onClick={this.sendMessage} className="btn btn-primary form-control">Send
                        </button>
                    </div>
                    <div className="users-list">
                        {this.state.users.map((user, i) => {
                            return (<div key={i}>
                                <span className="user-label">{user}</span>
                            </div>)
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

export default Chat;