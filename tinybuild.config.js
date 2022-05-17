const config = {
  "bundler": {
    "entryPoints": [
      "src/app.js"
    ],
    "outfile": "dist/app",
    "bundleBrowser": true,
    "bundleESM": false,
    "bundleTypes": false,
    "bundleNode": false,
    "bundleHTML": false
  },
  "server": {
    "debug": false,
    "protocol": "http",
    "host": "localhost",
    "port": 8080,
    "startpage": "spectrometer.html",
    "socket_protocol": "ws",
    "hotreload": 5000,
    "pwa": "dist/service-worker.js",
    "python": false,
    "python_node": 7001,
    "errpage": "src/other/404.html",
    "certpath": "node_server/ssl/cert.pem",
    "keypath": "node_server/ssl/key.pem"
  }
}

module.exports = config; //node (unless package.json marked as type:module)/es5
//export default config //es6