import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { Client } from 'ssh2'
import net from 'net'

dotenv.config()

/**
 * Creates an SSH tunnel and returns a MySQL connection pool 
 * that connects through the tunnel.
 */
async function createSshTunnelPool() {
  const sshConfig = {
    host: process.env.SSH_HOST,
    port: process.env.TUNNEL_PORT,
    username: process.env.SSH_USER,
    privateKey: process.env.SSH_PRIVATE_KEY
  };

  const dbConfig = {
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONN_LIMIT),
    queueLimit: 0
  };

  return new Promise((resolve, reject) => {
    const sshClient = new Client();

    sshClient.on('ready', () => {
      console.log('✅ SSH Tunnel Connection Ready');

      const tunnelServer = net.createServer((socket) => {
        sshClient.forwardOut(
          '127.0.0.1',         // Source address
          socket.remotePort,   // Source port
          '127.0.0.1',         // Destination address (on the remote server)
          3306,                // Destination port (MySQL default)
          (err, stream) => {
            if (err) {
              console.error('❌ SSH Forwarding Error:', err);
              return socket.end();
            }

            // Pipe data between the local socket and the SSH stream
            socket.pipe(stream).pipe(socket);

            stream.on('close', () => socket.end());
            socket.on('close', () => stream.end());
            stream.on('error', (err) => {
              console.error('❌ SSH Stream Error:', err);
              socket.destroy();
            });
            socket.on('error', (err) => {
              console.error('❌ Local Socket Error:', err);
              stream.destroy();
            });
          }
        );
      });

      // Listen on a random available port on localhost
      tunnelServer.listen(0, '127.0.0.1', () => {
        const localPort = tunnelServer.address().port;
        console.log(`✅ SSH Tunnel established on local port ${localPort}`);

        // Point the MySQL pool to the local tunnel server
        const pool = mysql.createPool({
          ...dbConfig,
          host: '127.0.0.1',
          port: localPort
        });

        resolve(pool);
      });

      tunnelServer.on('error', (err) => {
        console.error('❌ Tunnel Server Error:', err);
        reject(err);
      });
    });

    sshClient.on('error', (err) => {
      console.error('❌ SSH Connection Error:', err);
      reject(err);
    });

    console.log(`Connecting to SSH: ${sshConfig.username}@${sshConfig.host}...`);
    sshClient.connect(sshConfig);
  });
}

// Export the pool using top-level await (supported in Node.js 14.8+)
export const pool = await createSshTunnelPool();
