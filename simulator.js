const mqtt = require("mqtt");
const fs = require("fs");

const BROKER_URL =
  "mqtts://aw143fs1o93vt-ats.iot.ap-southeast-2.amazonaws.com:8883";

const MQTT_TOPIC = "sit314/fingerprint/access";

const TOTAL_EVENTS = Number(process.argv[2] || 1000);

// Controlled publishing rate
const EVENTS_PER_SECOND = 50;
const INTERVAL_MS = 1000 / EVENTS_PER_SECOND;

const options = {
  key: fs.readFileSync(
    "../aws-certs/0f0e687216c54c5a1c083b543bae059ef60460275097bbf362052a145308c2d2-private.pem.key"
  ),

  cert: fs.readFileSync(
    "../aws-certs/0f0e687216c54c5a1c083b543bae059ef60460275097bbf362052a145308c2d2-certificate.pem.crt"
  ),

  ca: fs.readFileSync(
    "../aws-certs/AmazonRootCA1.pem"
  )
};

const doors = [
  "DOOR-01",
  "DOOR-02",
  "DOOR-03"
];

const users = [
  "EMP001",
  "EMP002",
  "EMP003",
  "EMP004"
];

const client = mqtt.connect(BROKER_URL, options);

function generateAccessEvent() {

  const doorId =
    doors[Math.floor(Math.random() * doors.length)];

  const knownUser =
    Math.random() < 0.85;

  const userId = knownUser
    ? users[Math.floor(Math.random() * users.length)]
    : "UNKNOWN";

  const result =
    knownUser ? "GRANTED" : "DENIED";

  return {
    doorId,
    userId,
    result,
    timestamp: new Date().toISOString()
  };
}

client.on("connect", () => {

  console.log("==========================================");
  console.log("AWS IoT CORE CONTROLLED LOAD TEST");
  console.log("==========================================");

  console.log(`Target events: ${TOTAL_EVENTS}`);
  console.log(`MQTT topic: ${MQTT_TOPIC}`);
  console.log(`Target rate: ${EVENTS_PER_SECOND} events/sec`);
  console.log("MQTT QoS: 1");
  console.log("Publishing at controlled rate...\n");

  const startTime = Date.now();

  let sent = 0;
  let published = 0;
  let errors = 0;
  let finished = false;

  function finishTest() {

    if (finished) {
      return;
    }

    finished = true;

    const duration =
      (Date.now() - startTime) / 1000;

    const rate =
      published / duration;

    console.log(
      "\n=========================================="
    );

    console.log("LOAD TEST COMPLETE");

    console.log(
      "=========================================="
    );

    console.log(
      `Total events: ${TOTAL_EVENTS}`
    );

    console.log(
      `Successfully published: ${published}`
    );

    console.log(
      `Publish errors: ${errors}`
    );

    console.log(
      `Duration: ${duration.toFixed(2)} seconds`
    );

    console.log(
      `Average publish rate: ${rate.toFixed(2)} events/sec`
    );

    console.log(
      "=========================================="
    );

    client.end();
  }

  const interval = setInterval(() => {

    if (sent >= TOTAL_EVENTS) {

      clearInterval(interval);

      // Wait for all outstanding QoS 1 callbacks
      const waitForCallbacks = setInterval(() => {

        if (published + errors >= TOTAL_EVENTS) {

          clearInterval(waitForCallbacks);

          finishTest();
        }

      }, 50);

      return;
    }

    const event = generateAccessEvent();

    sent++;

    client.publish(
      MQTT_TOPIC,
      JSON.stringify(event),
      {
        qos: 1
      },
      (error) => {

        if (error) {

          errors++;

          console.error(
            "MQTT publish error:",
            error.message
          );

        } else {

          published++;

          if (
            published % 100 === 0 ||
            published === TOTAL_EVENTS
          ) {

            console.log(
              `Published ${published}/${TOTAL_EVENTS}`
            );
          }
        }

        if (
          sent >= TOTAL_EVENTS &&
          published + errors >= TOTAL_EVENTS
        ) {

          clearInterval(interval);

          finishTest();
        }
      }
    );

  }, INTERVAL_MS);
});

client.on("error", (error) => {

  console.error(
    "AWS IoT MQTT connection error:",
    error.message
  );

});

client.on("close", () => {

  console.log(
    "AWS IoT MQTT connection closed."
  );

});