import React from 'react';

export default class Connect extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            nick: '',
        };
    }

    connectHandle = () => {
        // tests if onConnect is a function and return nick of user
        if (this.props.onConnect instanceof  Function)
            this.props.onConnect(this.state.nick);
    }

    render() {
        return (
            <div className="center">
                <div className="card">
                    <div className="container">
                        <input type="text" placeholder="Username" style={{margin: '50px'}} value={this.state.nick}
                               onKeyDown={e => {
                                   if (e.key === 'Enter') this.connectHandle()
                               }}
                               onChange={e => this.setState({nick: e.target.value})}
                        />
                        <button onClick={this.connectHandle}>
                            Connect
                        </button>
                    </div>
                </div>
            </div>
        )
    }

}