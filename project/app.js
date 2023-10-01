const express = require("express");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const fs = require("fs");
const { start } = require("repl");

const dbPath = "./db.json"; //Default db.json ==> {"users": {}, "deploymentsQueue":[],"completedQueue":[]}

const port = 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var users = undefined; //password SHA1 ile hashlenmiş olmalı
var deploymentsQueue = [];
var completedQueue = [];
var activeProcess = undefined;
var isProgress = false;

//--------------------------
// Response Model
//--------------------------
class Response {
  constructor(status, data) {
    this.data = {};
    if (data != undefined) {
      console.log(status);
      console.log(data);
      if (status) {
        this.data.id = data;
      } else {
        this.data.message = data;
      }
    }
    this.status = status;
    this.data.deploymentsQueue = deploymentsQueue;
    this.data.completedQueue = completedQueue;
  }
}

//--------------------------
// Functions
//--------------------------

//User Kontrol
function checkUser(email) {
  if (users.hasOwnProperty(email)) {
    return true;
  } else {
    return false;
  }
}

//user and queue data will write in db.json
function saveDB() {
  fs.writeFile(
    dbPath,
    JSON.stringify({ users, deploymentsQueue, completedQueue }),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
    }
  );
}
//user and queue data are written from db.json
function readDB() {
  fs.readFile(dbPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    try {
      const jsonData = JSON.parse(data);
      users = jsonData.users;
      deploymentsQueue = jsonData.deploymentsQueue;
      completedQueue = jsonData.completedQueue;

      if (deploymentsQueue.length > 0) {
        startDeployment();
      }
    } catch (error) {
      console.log("db.json okunamadı ===> " + error);
    }
  });
}

//Deletes old deployments from the completed list
function removeOldDeployments() {
  const checkTime = moment().subtract(2, "days").startOf("day");

  for (let i = completedQueue.length - 1; i >= 0; i--) {
    const item = completedQueue[i];
    const deploymentEndTime = moment(
      item.deploymentEndTime,
      "DD.MM.YYYY HH:mm"
    );

    if (deploymentEndTime.isSameOrBefore(checkTime)) {
      completedQueue.splice(i, 1);
    }
  }
}

//create a deployment Object.
function createDeploymentObject(
  appName,
  versionNumber,
  buildNumber,
  appBranch,
  appScheme,
  whatsNew,
  userEmail
) {
  return {
    id: uuidv4(),
    appName,
    appScheme,
    appBranch,
    versionNumber,
    buildNumber,
    whatsNew,
    addQueueTime: moment().format("DD.MM.YYYY HH:mm"),
    deploymentEndTime: "",
    status: "Waiting",
    userEmail,
  };
}

//It starts for deployment with the next Deployment Object.
function startDeployment() {
  if (!isProgress) {
    isProgress = true;
    var activeItem = deploymentsQueue[0];
    const {
      appName,
      versionNumber,
      buildNumber,
      appBranch,
      appScheme,
      whatsNew,
    } = activeItem;
    activeItem.status = "Active";
    const command = `fastlane ios autoDeploy appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}`;
    const options = {};

    console.log(
      `=====> Build İşlemi Başlıyor: appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}`
    );

    activeProcess = exec(command, options);

    activeProcess.stdout.on("data", (data) => {
      console.log("stdout: ===> " + data);
      if (data.includes("fastlane finished with errors")) {
        //Archive Failed
        activeItem.status = "Failed";
        activeItem.deploymentEndTime = moment().format("DD.MM.YYYY HH:mm");
        completedQueue.push(activeItem);
        deploymentsQueue.shift();
        removeOldDeployments();
        isProgress = false;
        saveDB();

        console.log(
          `=====> Build İşlemi Başarıyla Tamamlanamadı :( => appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}`
        );
      } else if (
        data.includes("fastlane.tools just saved you") ||
        data.includes("fastlane.tools finished successfully")
      ) {
        //Archive Succeded
        activeItem.status = "Succeeded";
        activeItem.deploymentEndTime = moment().format("DD.MM.YYYY HH:mm");
        completedQueue.push(activeItem);
        deploymentsQueue.shift();
        removeOldDeployments();
        isProgress = false;
        saveDB();

        console.log(
          `=====> Build İşlemi Başarıyla Tamamlandı :) => appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}`
        );
      }
    });

    activeProcess.stderr.on("data", (data) => {
      console.log("stderr: ===> " + data);
    });

    activeProcess.on("close", (code) => {
      if (deploymentsQueue.length > 0) {
        startDeployment();
      }
    });
  }
}

//--------------------------
// Services
//--------------------------

app.get("/ping", async (req, res) => {
  res.json(new Response(true));
});

// User Services
//--------------------------

//User Credentials Functions
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (users.hasOwnProperty(email)) {
    const pass = users[email];

    if (pass === password) {
      res.json(new Response(true));
    } else {
      //Password not correct
      res.status(500).send(new Response(false, `Password not correct!`));
    }
  } else {
    //User not found
    res.status(500).send(new Response(false, `User not found!`));
  }
});

//add user
app.post("/addUser", async (req, res) => {
  const { email, password } = req.body;

  if (!users.hasOwnProperty(email)) {
    users[email] = password;
    saveDB();
    res.json(new Response(true));
  } else {
    res.status(500).send(new Response(false, `User alredy exist!`));
  }
});

//remove user
app.post("/deleteUser", async (req, res) => {
  const { email } = req.body;

  if (users.hasOwnProperty(email)) {
    delete users[email];
    saveDB();
    res.json(new Response(true));
  } else {
    res.status(500).send(new Response(false, `User not found!`));
  }
});

//change password
app.post("/changePassword", async (req, res) => {
  const { email, password } = req.body;

  if (users.hasOwnProperty(email)) {
    users[email] = password;
    saveDB();
    res.json(new Response(true));
  } else {
    res.status(500).send(new Response(false, `User not found!`));
  }
});

// Fastlane Services
//--------------------------

//Creates and queues a deployment object according to the parameters received from the Service.
app.post("/startDeployment", async (req, res) => {
  const {
    appName,
    versionNumber,
    buildNumber,
    appBranch,
    appScheme,
    whatsNew,
    email,
  } = req.body;

  if (email != undefined && email != "" && checkUser(email) === false) {
    res
      .status(500)
      .send(
        new Response(
          false,
          `Lütfen Parametreleri Kontrol Ediniz: appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}, email:${email}`
        )
      );
    return;
  }

  if (email != undefined && email != "") {
    const deployment = createDeploymentObject(
      appName,
      versionNumber,
      buildNumber,
      appBranch,
      appScheme,
      whatsNew,
      email
    );

    deploymentsQueue.push(deployment);
    saveDB();
    res.json(new Response(true, deployment.id));

    startDeployment();
    return;
  }

  res
    .status(500)
    .send(
      new Response(
        false,
        `Lütfen Parametreleri Kontrol Ediniz: appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}, email:${email}`
      )
    );
});

//Claer All Queue
app.post("/removeAllQueue", async (req, res) => {
  const { email } = req.body;

  if (email != undefined && email != "" && checkUser(email) === false) {
    res
      .status(500)
      .send(
        new Response(
          false,
          `Lütfen Parametreleri Kontrol Ediniz: appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}, email:${email}`
        )
      );
    return;
  }

  if (deploymentsQueue.length > 0) {
    deploymentsQueue.splice(0, deploymentsQueue.length);
    if (activeProcess != undefined) {
      activeProcess.kill();
      activeProcess.kill();
      activeProcess = undefined;
      saveDB();
    }
  }

  res.json(new Response(true));
});

//Remove item with id in queue
app.post("/removeWithId", async (req, res) => {
  const { id, email } = req.body;
  if (email != undefined && email != "" && checkUser(email) === false) {
    res
      .status(500)
      .send(
        new Response(
          false,
          `Lütfen Parametreleri Kontrol Ediniz: appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}, email:${email}`
        )
      );
    return;
  }

  const index = deploymentsQueue.findIndex(
    (deployment) => deployment.id === id
  );

  if (index !== -1) {
    if (index === 0) {
      activeProcess.kill();
      activeProcess.kill();
      activeProcess = undefined;
    }

    deploymentsQueue.splice(index, 1);
    saveDB();
    res.json(new Response(true));
    return;
  } else {
    res
      .status(500)
      .send(new Response(false, `ID ${id} ile eşleşen bir öğe bulunamadı.`));
  }
});

//the item move to fisrt index in queue
app.post("/moveToFirst", async (req, res) => {
  const { id, email } = req.body;
  if (email != undefined && email != "" && checkUser(email) === false) {
    res
      .status(500)
      .send(
        new Response(
          false,
          `Lütfen Parametreleri Kontrol Ediniz: appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}, email:${email}`
        )
      );
    return;
  }

  const index = deploymentsQueue.findIndex(
    (deployment) => deployment.id === id
  );

  if (index !== -1) {
    const deployment = deploymentsQueue.splice(index, 1)[0];
    deploymentsQueue.unshift(deployment);
    saveDB();
    res.json(new Response(true));
    return;
  } else {
    res
      .status(500)
      .send(new Response(false, `ID ${id} ile eşleşen bir öğe bulunamadı.`));
  }
});

//return all queue
app.post("/getQueue", async (req, res) => {
  const { email } = req.body;
  if (email != undefined && email != "" && checkUser(email) === false) {
    res
      .status(500)
      .send(
        new Response(
          false,
          `Lütfen Parametreleri Kontrol Ediniz: appName:${appName} versionNumber:${versionNumber} buildNumber:${buildNumber} appBranch:${appBranch} appScheme:${appScheme} whatsNew:${whatsNew}, email:${email}`
        )
      );
    return;
  }

  res.json(new Response(true));
});

//Start App....
app.listen(port, () => {
  console.log(`App start at: http://localhost:${port}`);
  readDB();
});
