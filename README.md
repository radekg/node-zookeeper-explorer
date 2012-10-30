# Zookeeper explorer for NodeJS

Zookeeper management web application for NodeJS. Implemented with:

- [expressjs](http://expressjs.com/)
- [node-zookeeper](https://github.com/yfinkelstein/node-zookeeper)
- [socket.io](http://socket.io)
- [jQuery](http://jquery.com)
- [jQuery cookie](https://github.com/carhartl/jquery-cookie)
- [Twitter Bootstrap](http://twitter.github.com/bootstrap/)
- [dynatree](http://code.google.com/p/dynatree/)
- [poshytip](https://github.com/vadikom/poshytip)

# Installation

    npm install node-zookeeper-explorer

Or from sources:

    mkdir node-zookeeper-explorer
    cd node-zookeeper-explorer
    git clone git@github.com:radekg/node-zookeeper-explorer.git .
    npm install

This app was built and tested with node 0.8.9.

# Running

    node app
    # or
    node app --port 80 # you may need sudo here
    # or
    # set ZK_BROWSER_PORT environemnt variable and launch
    node app

And in the browser go to: [http://localhost:3000](http://localhost:3000)

# Features

Planned or existing:

- lazy loading
- connection history
- mutiuser / multisession: more than one connection can be opened on the server side
- connection expiry on inactivity
- create, delete nodes, edit node data
- recursive delete
- recursive node create
- multinode delete
- watchers with auto-reload for current active node
- watchers with notifications for any node
- operation history with undo

Full status can be check in [Issues](https://github.com/radekg/node-zookeeper-explorer/issues?state=open).

# License

MIT
unless stated otherwise in an appropriate file.
