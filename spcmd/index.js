import * as tf from "@tensorflow/tfjs";
import * as speechCommands from "@tensorflow-models/speech-commands";
import socket from "./socket";
import countBy from "lodash.countby";

const droneState = {
  droneStatus: "",
  currentMode: ""
};

function sendCommand(command) {
  console.log(`Sending the command ${command}`);
  socket.emit("command", command);
}

function updateDroneState(status) {
  console.log(status);
  document.querySelector("#droneState").textContent = status;
  droneState.droneStatus = status;
}

socket.on("status", updateDroneState);

let recognizer;

// One frame is ~23ms of audio.
const NUM_FRAMES = 4;
let examples = [];

const INPUT_SHAPE = [NUM_FRAMES, 232, 1];
let model;

window.train = async function() {
  toggleButtons(false);
  const ys = tf.oneHot(examples.map(e => e.label), 3);
  const xsShape = [examples.length, ...INPUT_SHAPE];
  const xs = tf.tensor(flatten(examples.map(e => e.vals)), xsShape);

  await model.fit(xs, ys, {
    batchSize: 16,
    epochs: 10,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        document.querySelector("#console").textContent = `Accuracy: ${(
          logs.acc * 100
        ).toFixed(1)}% Epoch: ${epoch + 1}`;
      }
    }
  });
  tf.dispose([xs, ys]);
  toggleButtons(true);
};

function buildModel() {
  model = tf.sequential();
  model.add(
    tf.layers.depthwiseConv2d({
      depthMultiplier: 8,
      kernelSize: [NUM_FRAMES, 3],
      activation: "relu",
      inputShape: INPUT_SHAPE
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [1, 2], strides: [2, 2] }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 3, activation: "softmax" }));
  const optimizer = tf.train.adam(0.01);
  model.compile({
    optimizer,
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"]
  });
}

function toggleButtons(enable) {
  document.querySelectorAll("button").forEach(b => (b.disabled = !enable));
}

function flatten(tensors) {
  const size = tensors[0].length;
  const result = new Float32Array(tensors.length * size);
  tensors.forEach((arr, i) => result.set(arr, i * size));
  return result;
}

window.collect = function(label) {
  if (recognizer.isListening()) {
    return recognizer.stopListening();
  }
  if (label == null) {
    return;
  }
  recognizer.listen(
    async ({ spectrogram: { frameSize, data } }) => {
      let vals = normalize(data.subarray(-frameSize * NUM_FRAMES));
      examples.push({ vals, label });
      document.querySelector(
        "#console"
      ).textContent = `${examples.length} examples collected`;
    },
    {
      overlapFactor: 0.999,
      includeSpectrogram: true,
      invokeCallbackOnNoiseAndUnknown: true
    }
  );
};

function normalize(x) {
  const mean = -100;
  const std = 10;
  return x.map(x => (x - mean) / std);
}

function controlDrone(labelTensor) {
  const count = countBy(labelTensor, l => l["0"]);

  console.log(count);

  var label = Object.keys(count).reduce((a, b) =>
    count[a] > count[b] ? a : b
  );

  switch (label) {
    case "0":
      if (
        droneState.droneStatus === "ok" &&
        (droneState.currentMode === "" || droneState.currentMode === "landed")
      ) {
        document.getElementById("droneState").textContent = "Taking off 🛫";
        sendCommand("takeoff");
        droneState.currentMode = "onair";
        console.log("takeoff");
      }
      break;
    case "1":
      if (
        droneState.droneStatus === "ok" &&
        droneState.currentMode === "flipped"
      ) {
        document.getElementById("droneState").textContent = "Landing 🛬";
        sendCommand("land");
        droneState.currentMode = "landed";
        console.log("landed");
      }
      break;
    case "2":
      if (
        droneState.droneStatus === "ok" &&
        droneState.currentMode === "onair"
      ) {
        document.getElementById("droneState").textContent = "Flipping 🌀";
        sendCommand("flip l");
        sendCommand("flip r");
        droneState.currentMode = "flipped";
        console.log("flipped");
      }
      break;
  }
}

const predictedLabels = [];

window.listen = function() {
  if (recognizer.isListening()) {
    recognizer.stopListening();
    toggleButtons(true);
    document.getElementsByClassName("eyes")[0].classList.remove("up");
    document.getElementsByClassName("tail")[0].classList.remove("listening");
    document.getElementById("listen").textContent = "Listen 👂🏼";
    controlDrone(predictedLabels);
    return;
  }
  document.getElementsByClassName("eyes")[0].classList.add("up");
  document.getElementsByClassName("tail")[0].classList.add("listening");
  predictedLabels.splice(0, predictedLabels.length);
  toggleButtons(false);
  document.getElementById("listen").textContent = "Stop 👂🏼";
  document.getElementById("listen").disabled = false;

  recognizer.listen(
    async ({ spectrogram: { frameSize, data } }) => {
      const vals = normalize(data.subarray(-frameSize * NUM_FRAMES));
      const input = tf.tensor(vals, [1, ...INPUT_SHAPE]);
      const probs = model.predict(input);
      const predLabel = probs.argMax(1);
      const lData = await predLabel.data();
      predictedLabels.push(lData);
      tf.dispose([input, probs, predLabel]);
    },
    {
      overlapFactor: 0.999,
      includeSpectrogram: true,
      invokeCallbackOnNoiseAndUnknown: true
    }
  );
};

window.connect = function() {
  droneState.droneStatus = "";
  droneState.currentMode = "";
  sendCommand("command");
};

async function app() {
  recognizer = speechCommands.create("BROWSER_FFT");
  await recognizer.ensureModelLoaded();
  // predictWord();
  buildModel();
}

app();
