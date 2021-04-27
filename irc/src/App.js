import React, {Component} from 'react';
import Chat from "./Chat";
import Connect from "./Connect";

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            nick: null
        }
    }

    connect = nick => this.setState({nick: nick});

    render() {
        const content = this.state.nick ? <Chat nick={this.state.nick}></Chat> : <Connect onConnect={this.connect}/>;
        return (
            <div>
                {content}
            </div>
        );
    }
}

export default App;
