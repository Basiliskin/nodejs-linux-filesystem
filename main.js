const {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require('worker_threads');
const os = require('os');
const {
    createFile,
    execCommand,
    promisePool,
    generateFakeEmail,
    generateFakePassword
} = require('./utils');

const mountFolder = '/mnt/onem';
if (isMainThread) {
    const maxFileCount = 1000000;
    const numCores = Math.max(10, os.cpus().length);
    console.log(`Number of CPU cores: ${numCores}`);
    const mainProcess = async () => {
        console.time('mainProcess');
        let res = await execCommand('dd if=/dev/zero of=img bs=1G count=1');
        res = await execCommand(`mkfs.ext4 -b 1024 -I 512 -O dir_index -O ^has_journal -N ${maxFileCount} img`);
        res = await execCommand(`sudo mkdir -p ${mountFolder}`);
        res = await execCommand(`sudo mount -o noatime img ${mountFolder}`);
        res = await execCommand(`sudo chmod -R 777 ${mountFolder}`);
        // Create workers for each CPU core
        const finishMainProcess = async () => {
            res = await execCommand(`sudo umount ${mountFolder}`);
            res = await execCommand('rm img');
            console.log("All workers have finished.");
            console.timeEnd('mainProcess');
            process.exit(); // Exit the main process when all workers have finished
        };
        let activeWorkers = numCores;
        for (let i = 0; i < numCores; i++) {
            const worker = new Worker(__filename, {
                workerData: {
                    workerIndex: i
                }
            });
            worker.on('message', (message) => {
                console.log(`Worker ${i}:`, JSON.parse(message));
            });
            worker.on('exit', async () => {
                activeWorkers--;
                if (activeWorkers === 0) {
                    await finishMainProcess();
                }
            });
        }
    };
    mainProcess();
} else {
    const workerIndex = workerData.workerIndex;
    const start = new Date();

    const state = {
        workerIndex,
        start
    };
    const fakeData = [];
    for (let i = 0; i < 100000; i++) {
        const email = generateFakeEmail();
        const password = generateFakePassword();
        fakeData.push({ email, password });
    }
    const finish = async () => {
        const result = await promisePool({
            array: fakeData,
            poolSize: 1000,
            handler: async ({ email, password }) => {
                return createFile({ mountFolder, email, password });
            }
        });
        const end = new Date();
        state.end = end;
        state.time = (end.getTime() - start.getTime()) / 1000;
        state.count = result.length;
        parentPort.postMessage(JSON.stringify(state));
    };
    finish();
}