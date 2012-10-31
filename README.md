# Zookeeper explorer for NodeJS

[Zookeeper](http://zookeeper.apache.org) management web application for [node.js](http://nodejs.org). Implemented with:

- [expressjs](http://expressjs.com/) and [jade](http://jade-lang.com)
- [node-zookeeper](https://github.com/yfinkelstein/node-zookeeper)
- [socket.io](http://socket.io)
- [node-uuid](https://github.com/broofa/node-uuid)
- [js-yaml](https://github.com/nodeca/js-yaml)
- [jQuery](http://jquery.com)
- [jQuery cookie](https://github.com/carhartl/jquery-cookie)
- [Twitter Bootstrap](http://twitter.github.com/bootstrap/)
- [dynatree](http://code.google.com/p/dynatree/)
- [poshytip](https://github.com/vadikom/poshytip)

# Installation

    mkdir node-zookeeper-explorer
    cd node-zookeeper-explorer
    git clone git@github.com:radekg/node-zookeeper-explorer.git .
    npm install

This app was built and tested with node 0.8.9.

# Running

    node app
    # or
    node app --port 80 # you may need sudo for ports lower than 1025
    # or
    # set ZK_BROWSER_PORT environemnt variable and launch
    node app

And in the browser go to: [http://localhost:3000](http://localhost:3000) or whatever is the port you are using.

# Features

Planned or existing:

- single user authentication
- ability to disable authentication requirement
- lazy loading
- connection history
- watchers with auto-reload for current active node
- watchers with notifications for any node
- mutiuser / multisession: more than one connection can be opened on the server side for the same session
- create new nodes, create nested nodes
- delete nodes, recursive delete, delete more than one node
- edit node data

# License

MIT, unless stated otherwise in an appropriate file.

# Authors

- [Rad Gruchalski](https://github.com/radekg/)
