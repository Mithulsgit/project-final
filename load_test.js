const mqtt = require("mqtt");

const BROKER_URL = "mqtt://test.mosquitto.org";
const MQTT_TOPIC = "sit314/fingerprint/access";

const TOTAL_EVENTS = Number(process.argv[2]) || 100;

const client = mqtt.connect(BROKER_URL);

let sent = 0;
const startTime = Date.now();

client.on("connect", () => {
    console.log("Connected to MQTT broker");
    console.log(`Sending ${TOTAL_EVENTS} fingerprint events...`);

    const interval = setInterval(() => {
        const knownUser = Math.random() < 0.85;

        const event = {
            doorId: `DOOR-0${Math.floor(Math.random() * 3) + 1}`,
            userId: knownUser
                ? `EMP00${Math.floor(Math.random() * 4) + 1}`
                : "UNKNOWN",
            result: knownUser ? "GRANTED" : "DENIED",
            timestamp: new Date().toISOString()
        };

        client.publish(
            MQTT_TOPIC,
            JSON.stringify(event),
            { qos: 0 },
            (error) => {
                if (error) {
                    console.error("Publish error:", error.message);
                    return;
                }

                sent++;

                if (sent % 100 === 0 || sent === TOTAL_EVENTS) {
                    console.log(`Sent: ${sent}/${TOTAL_EVENTS}`);
                }

                if (sent === TOTAL_EVENTS) {
                    clearInterval(interval);

                    const duration = (Date.now() - startTime) / 1000;
                    const rate = TOTAL_EVENTS / duration;

                    console.log("\nLoad test complete");
                    console.log(`Events sent: ${TOTAL_EVENTS}`);
                    console.log(`Duration: ${duration.toFixed(2)} seconds`);
                    console.log(`Send rate: ${rate.toFixed(2)} events/sec`);

                    setTimeout(() => {
                        client.end();
                    }, 1000);
                }
            }
        );
    }, 10);
});

client.on("error", (error) => {
    console.error("MQTT error:", error.message);
});
