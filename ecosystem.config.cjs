module.exports = {
  apps: [
    {
      name: "thethinker",
      cwd: "/root/thethinker",
      script: "index.js",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        THINKER_AGENT_COUNT: "6",
        THINKER_TURN_DELAY_MS: "15000",
        THINKER_PORT: "3847",
      },
    },
  ],
};
