import { task, subtask } from "hardhat/config";
import { assert } from "console";

task("full-pingpong")
  .addOptionalParam("message", "The message that should be bridged", "Hello from BSC")
  .addOptionalParam("hostNetwork", "Network to deploy the Host contract on", "bsc-testnet")
  .addOptionalParam("hostMainChain", "Main chain of the host network", "bsc")
  .addOptionalParam("enclaveNetwork", "Network to deploy the Enclave contract on", "sapphire-testnet")
  .setAction(async ({message, hostNetwork, hostMainChain, enclaveNetwork}, hre) => {
    const { pingAddr, pongAddr } = await hre.run("deploy-pingpong", {
      hostNetwork,
      hostMainChain,
      enclaveNetwork
    });
    console.log("===========================");
    await hre.run("send-ping", {
      pingAddr,
      message,
      hostNetwork,
    });
    console.log("===========================");
    await hre.run("verify-ping", {
      pongAddr,
      message,
      enclaveNetwork
    });
  })


task('deploy-pingpong')
  .addOptionalParam("hostNetwork", "Network to deploy the Host contract on", "bsc-testnet")
  .addOptionalParam("hostMainChain", "Main chain of the host network", "bsc")
  .addOptionalParam("enclaveNetwork", "Network to deploy the Enclave contract on", "sapphire-testnet")
  .setAction(async ({hostNetwork, hostMainChain, enclaveNetwork}, hre) => {
    // Ensure contracts are compiled before proceeding
    await hre.run('compile');
    console.log("Start deployment of PingPong...");

    console.log("===========================");
    const calculatedPongAddr = await hre.run('nextAddress', { onNetwork: enclaveNetwork });
    console.log(`Calculated Pong address: ${calculatedPongAddr}`);
    console.log("===========================");
    const pingAddr = await hre.run("deployPing", {
        hostNetwork,
        calculatedPongAddr
    });
    console.log("===========================");
    const pongAddr = await hre.run("deployPong", {
        enclaveNetwork,
        pingAddr,
        hostMainChain
    });
    return { pingAddr, pongAddr };
  });

subtask("deployPing")
  .addParam("hostNetwork")
  .addParam("calculatedPongAddr")
  .setAction(async ({hostNetwork, calculatedPongAddr}, hre) => {
    await hre.switchNetwork(hostNetwork);
    console.log(`Deploying on ${hre.network.name}...`);
    const Ping = await hre.ethers.getContractFactory("Ping");    
    const ping = await Ping.deploy(calculatedPongAddr);
    const pingAddr = await ping.waitForDeployment();
    console.log(`Ping deployed at: ${pingAddr.target}`);
    return pingAddr.target;
})

subtask("deployPong")
  .addParam("enclaveNetwork")
  .addParam("pingAddr")
  .addParam("hostMainChain")
  .setAction(async ({enclaveNetwork, pingAddr, hostMainChain}, hre) => {
    await hre.switchNetwork(enclaveNetwork);
    console.log(`Deploying on ${hre.network.name}...`);
    const Pong = await hre.ethers.getContractFactory("Pong");
    const pong = await Pong.deploy(pingAddr, hre.ethers.encodeBytes32String(hostMainChain));
    const pongAddr = await pong.waitForDeployment();
    console.log(`Pong deployed at: ${pongAddr.target}`);
    return pongAddr.target;
})

subtask("nextAddress")
  .addParam("onNetwork")
  .setAction(async ({onNetwork}, hre) => {
    const ethers = hre.ethers;
    await hre.switchNetwork(onNetwork);
    console.log(`Calculating next address on ${hre.network.name}...`);
    const signer = await hre.ethers.provider.getSigner();
    const signerAddr = await signer.getAddress();
    const nonce = await ethers.provider.getTransactionCount(signerAddr);
    return ethers.getCreateAddress({ from: signerAddr, nonce });
  })


task("send-ping")
  .addParam("pingAddr", "Address of the Ping contract")
  .addOptionalParam("message", "The message that should be bridged", "Hello from BSC")
  .addOptionalParam("hostNetwork", "Network to deploy the Host contract on", "bsc-testnet")
  .setAction(async ({pingAddr, message, hostNetwork}, hre) => {
    await hre.switchNetwork(hostNetwork);
    console.log(`Sending message on ${hre.network.name}...`);
    const signer = await hre.ethers.provider.getSigner();
    const ping = await hre.ethers.getContractAt("Ping", pingAddr, signer);
    const value = hre.ethers.parseEther('0.001');

    const result = await ping.getFunction('startPing')
      .send(hre.ethers.encodeBytes32String(message), { value });
    await result.wait();
    console.log("Message sent");
  })

  task('verify-ping')
  .addParam('pongAddr', 'Address of the Pong contract')
  .addOptionalParam("message", "The message that should be bridged", "Hello from BSC")
  .addOptionalParam("enclaveNetwork", "Network to deploy the Enclave contract on", "sapphire-testnet")
  .setAction(async ({pongAddr, message, enclaveNetwork}, hre) => {
    await hre.switchNetwork(enclaveNetwork);
    console.log(`Verifying message on ${hre.network.name}...`);
    let events;
    const spinner = ['-', '\\', '|', '/'];
    let current = 0;

    // Spinner animation
    const interval = setInterval(() => {
        process.stdout.write(`\rListing for event... ${spinner[current]}`);
        current = (current + 1) % spinner.length;
    }, 150);

    const signer = await hre.ethers.provider.getSigner();
    const pong = await hre.ethers.getContractAt("Pong", pongAddr, signer);

    do {
      const block = await hre.ethers.provider.getBlockNumber();

      events = await pong.queryFilter('MessageReceived', block - 10, 'latest');
      if (events.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
      }
    } while (events.length === 0);
    
    // Clear the spinner line
    clearInterval(interval);
    process.stdout.write(`\r`); 
    process.stdout.clearLine(0);

    const parsedEvent = pong.interface.parseLog(events[0]);
    // console.log(parsedEvent);
    const decoded = hre.ethers.decodeBytes32String(parsedEvent?.args[0]);
    console.log(`Message received with: ${decoded}`);
    assert(decoded == message);
  });

  task('encode-bytes')
  .addParam('str')
  .setAction(async ({str}, hre) => {
    console.log(hre.ethers.encodeBytes32String(str));
  })

  task('decode')
  .addParam('str')
  .setAction(async ({str}, hre) => {
    console.log(hre.ethers.decodeBytes32String(str));
  })