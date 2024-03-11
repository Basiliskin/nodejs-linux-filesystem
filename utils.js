const { exec } = require('child_process');
const fs = require('fs');

function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Function to generate a fake email address
function generateFakeEmail() {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com']; // Add more domains if needed
    const usernameLength = Math.floor(Math.random() * (10 - 5 + 1) + 5); // Random username length between 5 and 10
    const username = generateRandomString(usernameLength);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
}

// Function to generate a fake password
function generateFakePassword() {
    const passwordLength = Math.floor(Math.random() * (20 - 8 + 1) + 8); // Random password length between 8 and 20
    return generateRandomString(passwordLength);
}

function sleepAwait(milliSeconds = 100) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            clearTimeout(timer);
            resolve();
        }, milliSeconds);
    });
}

const promisePool = async ({
    array,
    poolSize,
    handler,
    waitForComplete = 500
}) => {
    const handlePromise = async (batch, cb) => {
        try {
            const r = await handler(batch);
            cb(r);
        } catch (e) {
            // console.log(e);
            cb();
        }
    };

    const poolState = {
        running: 0,
        limit: poolSize
    };
    const response = [];
    while (array.length) {
        if (poolState.running < poolState.limit) {
            poolState.running++;
            handlePromise(array.pop(), res => {
                response.push(res);
                poolState.running--;
            });
        } else {
            await sleepAwait();
        }
    }
    while (poolState.running) await sleepAwait(waitForComplete);
    return response;
};

const execCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return reject(error);
            }

            resolve(stdout);
        });
    });
};
function createFile({ mountFolder, email, password }) {
    fs.writeFileSync(`${mountFolder}/${email}.json`, password);
}
module.exports = {
    createFile,
    execCommand,
    promisePool,
    generateRandomString,
    generateFakeEmail,
    generateFakePassword
};