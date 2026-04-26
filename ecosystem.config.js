module.exports = {
  apps: [
    {
      name: "api",
      script: "./app.js",
      instances: 1, // or "max" for cluster
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "worker",
      script: "./worker/Analytics.js",
      instances: 1, // can scale later
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};