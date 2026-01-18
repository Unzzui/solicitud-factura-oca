const { spawn } = require('child_process');
const net = require('net');

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005];

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function findAvailablePort() {
  for (const port of PORTS) {
    const available = await checkPort(port);
    if (available) {
      return port;
    }
    console.log(`Puerto ${port} en uso, probando siguiente...`);
  }
  throw new Error('No se encontró ningún puerto disponible');
}

async function main() {
  try {
    const port = await findAvailablePort();
    console.log(`\n🚀 Iniciando servidor de producción en puerto ${port}\n`);
    console.log(`   Local:   http://localhost:${port}\n`);

    const child = spawn('npx', ['next', 'start', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (err) => {
      console.error('Error al iniciar:', err);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
