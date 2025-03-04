const { exec } = require("child_process");

const command = "serve -s build -l tcp://10.1.99.99:3000";
exec(command, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error: ${err.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
  }
  console.log(`Stdout: ${stdout}`);
});