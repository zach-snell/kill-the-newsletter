// Example Kill the Newsletter configuration

export default {
    server: {
      hostname: '0.0.0.0',
      port: 3000,
      secret: 'CHANGE_THIS_SECRET_KEY',
    },
    email: {
      host: 'smtp.example.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'your@email.com',
        pass: 'your-smtp-password',
      },
    },
    storage: {
      path: '/config/storage',
    },
  };
  