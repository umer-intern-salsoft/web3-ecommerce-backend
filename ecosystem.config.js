module.exports = {
  apps: [
    {
      name: "web3-ecommerce-backend",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "live",
      },
    },
  ],
};