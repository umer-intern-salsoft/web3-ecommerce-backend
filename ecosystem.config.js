export const apps = [
  {
    name: 'web3-ecommerce-backend',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
    },
  },
];

export default { apps };