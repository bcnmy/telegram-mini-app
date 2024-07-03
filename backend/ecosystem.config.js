module.exports = {
  apps: [
    {
      name: "backend",
      script: "src/app.ts",
      interpreter: "ts-node",
      watch: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
